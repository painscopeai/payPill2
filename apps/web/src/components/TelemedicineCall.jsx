import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, MessageSquare, FileText, Settings, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function TelemedicineCall() {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleEndCall = () => {
    toast.success('Call ended successfully');
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col md:flex-row">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col relative bg-black">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-red-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1.5">
              {isRecording && <Circle className="h-2 w-2 fill-current animate-pulse" />}
              {formatTime(elapsedTime)}
            </div>
            <span className="font-medium">Dr. Sarah Jenkins - Follow up</span>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Video Grid (Mock) */}
        <div className="flex-1 p-4 flex items-center justify-center relative">
          {/* Remote Video */}
          <div className="w-full h-full max-w-5xl max-h-[70vh] bg-zinc-800 rounded-2xl overflow-hidden relative border border-zinc-700 shadow-2xl flex items-center justify-center">
            <div className="text-center text-zinc-500">
              <UserAvatarPlaceholder />
              <p className="mt-4 font-medium">Dr. Sarah Jenkins</p>
            </div>
            
            {/* Local Video PIP */}
            <div className="absolute bottom-4 right-4 w-48 h-32 bg-zinc-900 rounded-xl border-2 border-zinc-700 overflow-hidden shadow-lg flex items-center justify-center">
              {isVideoOff ? (
                <VideoOff className="h-8 w-8 text-zinc-600" />
              ) : (
                <div className="text-zinc-500 text-sm">You</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="h-24 bg-zinc-950 flex items-center justify-center gap-4 px-6 border-t border-zinc-800">
          <Button 
            variant={isMuted ? "destructive" : "secondary"} 
            size="icon" 
            className="h-12 w-12 rounded-full"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          <Button 
            variant={isVideoOff ? "destructive" : "secondary"} 
            size="icon" 
            className="h-12 w-12 rounded-full"
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          <Button 
            variant="secondary" 
            size="icon" 
            className="h-12 w-12 rounded-full hidden sm:flex"
          >
            <MonitorUp className="h-5 w-5" />
          </Button>

          <Button 
            variant={isRecording ? "destructive" : "secondary"} 
            size="icon" 
            className="h-12 w-12 rounded-full hidden sm:flex"
            onClick={() => {
              setIsRecording(!isRecording);
              toast(isRecording ? 'Recording stopped' : 'Recording started');
            }}
          >
            <Circle className={`h-5 w-5 ${isRecording ? 'fill-current' : ''}`} />
          </Button>

          <Button 
            variant={showChat ? "default" : "secondary"} 
            size="icon" 
            className="h-12 w-12 rounded-full md:hidden"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          <Button 
            variant="destructive" 
            className="h-12 px-8 rounded-full font-semibold ml-4"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-5 w-5 mr-2" /> End Call
          </Button>
        </div>
      </div>

      {/* Sidebar (Chat & Notes) */}
      <div className={`w-full md:w-80 lg:w-96 bg-card border-l flex flex-col transition-all ${showChat ? 'block absolute inset-0 z-20 md:relative' : 'hidden md:flex'}`}>
        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Chat & Files</h3>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowChat(false)}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="text-center text-xs text-muted-foreground my-4">Call started at {new Date().toLocaleTimeString()}</div>
          
          <div className="bg-muted p-3 rounded-lg rounded-tl-none max-w-[85%]">
            <p className="text-sm">Hello! I've reviewed your recent lab results. We can discuss them now.</p>
            <span className="text-[10px] text-muted-foreground mt-1 block">Dr. Jenkins • 10:02 AM</span>
          </div>
          
          <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none max-w-[85%] ml-auto">
            <p className="text-sm">Great, thank you doctor.</p>
            <span className="text-[10px] text-primary-foreground/70 mt-1 block text-right">You • 10:03 AM</span>
          </div>
        </div>

        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="shrink-0"><FileText className="h-4 w-4" /></Button>
            <Input placeholder="Type a message..." className="flex-1" />
            <Button>Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserAvatarPlaceholder() {
  return (
    <div className="h-24 w-24 rounded-full bg-zinc-800 border-4 border-zinc-700 mx-auto flex items-center justify-center">
      <User className="h-12 w-12 text-zinc-600" />
    </div>
  );
}
import { User, XCircle } from 'lucide-react';