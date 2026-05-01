import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Mail, Shield, Pill, Calendar } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';

export default function CommunicationHub() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const records = await pb.collection('messages').getList(1, 50, {
          filter: `userId="${currentUser.id}"`,
          sort: '-created',
          $autoCancel: false
        });
        setMessages(records.items);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchMessages();
  }, [currentUser]);

  const renderMessageList = (type) => {
    const filtered = type === 'all' ? messages : messages.filter(m => m.sender_type === type);
    
    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading messages...</div>;
    if (filtered.length === 0) return <div className="p-8 text-center text-muted-foreground">No messages in this category.</div>;

    return (
      <div className="space-y-2">
        {filtered.map(msg => (
          <div key={msg.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-muted/50 ${!msg.read_status ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!msg.read_status ? 'bg-primary' : 'bg-transparent'}`} />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`font-medium ${!msg.read_status ? 'text-foreground' : 'text-muted-foreground'}`}>{msg.sender_name || 'System'}</h4>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 capitalize">{msg.sender_type}</Badge>
                </div>
                <p className="text-sm font-medium mt-0.5">{msg.subject}</p>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{msg.content}</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap sm:text-right pl-5 sm:pl-0">
              {new Date(msg.created).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="shadow-lg border-0 h-full">
      <Tabs defaultValue="all" className="w-full h-full flex flex-col">
        <div className="px-6 pt-6 pb-2 border-b overflow-x-auto">
          <TabsList className="inline-flex h-auto gap-2 bg-transparent">
            <TabsTrigger value="all" className="data-[state=active]:bg-muted py-2">
              <Mail className="h-4 w-4 mr-2" /> All
            </TabsTrigger>
            <TabsTrigger value="provider" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-2">
              Providers
            </TabsTrigger>
            <TabsTrigger value="pharmacy" className="data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary py-2">
              Pharmacy
            </TabsTrigger>
            <TabsTrigger value="insurance" className="data-[state=active]:bg-warning/10 data-[state=active]:text-warning py-2">
              Insurance
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="p-6 flex-1 overflow-y-auto">
          <TabsContent value="all" className="mt-0">{renderMessageList('all')}</TabsContent>
          <TabsContent value="provider" className="mt-0">{renderMessageList('provider')}</TabsContent>
          <TabsContent value="pharmacy" className="mt-0">{renderMessageList('pharmacy')}</TabsContent>
          <TabsContent value="insurance" className="mt-0">{renderMessageList('insurance')}</TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}