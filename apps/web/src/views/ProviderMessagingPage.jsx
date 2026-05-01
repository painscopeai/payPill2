import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMessages } from '@/hooks/useMessages.js';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function ProviderMessagingPage() {
  const { messages, loading } = useMessages();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Messages - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Secure Messaging</h1>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <LoadingSpinner /> : messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className="p-4 border rounded-lg">
                    <h4 className="font-semibold">{msg.subject}</h4>
                    <p className="text-sm text-muted-foreground">{msg.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 border rounded-xl border-dashed text-muted-foreground">
                No messages.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}