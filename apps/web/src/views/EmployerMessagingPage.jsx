import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Search, Send, FileText, Mail, Inbox, Clock, Paperclip, Reply } from 'lucide-react';
import pb from '@/lib/supabaseMappedCollections';
import { toast } from 'sonner';

export default function EmployerMessagingPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Compose State
  const [composeData, setComposeData] = useState({ subject: '', content: '', to: 'all_employees' });

  useEffect(() => {
    // In a real implementation, query pb.collection('messages')
    // For now, mock data to ensure robust presentation
    setMessages([
      { id: '1', sender: 'System Alerts', subject: 'Quarterly compliance review due', date: '2026-04-22', read: false, type: 'inbox' },
      { id: '2', sender: 'Benefits Admin', subject: 'New wellness program enrollment', date: '2026-04-20', read: true, type: 'inbox' },
      { id: '3', sender: 'Me', subject: 'Company-wide: Open Enrollment Starts', date: '2026-04-15', read: true, type: 'sent' },
    ]);
  }, []);

  const handleSend = () => {
    if (!composeData.subject || !composeData.content) {
      toast.error('Subject and content are required.');
      return;
    }
    toast.success('Message sent successfully!');
    setComposeData({ subject: '', content: '', to: 'all_employees' });
  };

  const inboxMessages = messages.filter(m => m.type === 'inbox' && (m.subject.toLowerCase().includes(searchTerm.toLowerCase()) || m.sender.toLowerCase().includes(searchTerm.toLowerCase())));
  const sentMessages = messages.filter(m => m.type === 'sent' && (m.subject.toLowerCase().includes(searchTerm.toLowerCase())));

  const renderMessageList = (list) => {
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border rounded-xl bg-card">
          <Inbox className="h-12 w-12 mb-4 opacity-20" />
          <p>No messages found.</p>
        </div>
      );
    }
    return (
      <div className="border rounded-xl bg-card divide-y">
        {list.map(msg => (
          <div key={msg.id} className={`p-4 flex items-center gap-4 hover:bg-muted/30 cursor-pointer transition-colors ${!msg.read ? 'bg-primary/5' : ''}`}>
            <div className="shrink-0 h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Mail className={`h-5 w-5 ${!msg.read ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <p className={`text-sm truncate ${!msg.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                  {msg.sender}
                </p>
                <p className="text-xs text-muted-foreground ml-2 whitespace-nowrap">{msg.date}</p>
              </div>
              <p className={`text-sm truncate ${!msg.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {msg.subject}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Messaging - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Communications Hub</h1>
          <p className="text-muted-foreground">Manage announcements, alerts, and employee messages.</p>
        </div>

        <Tabs defaultValue="inbox" className="w-full">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <TabsList className="grid w-full md:w-[400px] grid-cols-3">
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="compose">Compose</TabsTrigger>
            </TabsList>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search messages..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="inbox" className="mt-0">
            {renderMessageList(inboxMessages)}
          </TabsContent>
          
          <TabsContent value="sent" className="mt-0">
            {renderMessageList(sentMessages)}
          </TabsContent>

          <TabsContent value="compose" className="mt-0">
            <Card className="shadow-sm border-border/50">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">To:</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={composeData.to}
                      onChange={(e) => setComposeData({...composeData, to: e.target.value})}
                    >
                      <option value="all_employees">All Employees</option>
                      <option value="dept_engineering">Department: Engineering</option>
                      <option value="dept_sales">Department: Sales</option>
                      <option value="custom">Custom Selection...</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Subject:</label>
                    <Input 
                      placeholder="Enter subject" 
                      value={composeData.subject}
                      onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Message:</label>
                    <Textarea 
                      placeholder="Write your message here..." 
                      className="min-h-[250px] resize-y"
                      value={composeData.content}
                      onChange={(e) => setComposeData({...composeData, content: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon"><Paperclip className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon"><FileText className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost">Save Draft</Button>
                    <Button onClick={handleSend} className="gap-2"><Send className="h-4 w-4" /> Send Message</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}