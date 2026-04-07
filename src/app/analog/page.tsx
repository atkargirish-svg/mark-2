'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { ref, onValue, set } from 'firebase/database';
import { MicIcon, Bot, Zap, Loader2, ArrowLeft, Move, Volume2, VolumeX, Activity, Terminal, ShieldCheck, Lock, Unlock, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ArmState, ChatMessage } from '@/lib/types';
import { DEFAULT_ARM_STATE } from '@/lib/types';

const STORAGE_KEY = 'revo_analog_v1';

export default function AnalogControlPage() {
  const { database } = useFirebase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHolding, setIsHolding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { toast } = useToast();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentTranscriptRef = useRef('');
  const [localState, setLocalState] = useState<ArmState>(DEFAULT_ARM_STATE);
  const lastSentRef = useRef<number>(0);
  const THROTTLE_DELAY = 50;

  // Joystick state
  const joystickRef = useRef<HTMLDivElement>(null);
  const [isJoystickActive, setIsJoystickActive] = useState(false);

  const syncToFirebase = useCallback((state: ArmState) => {
    if (!database) return;
    const physicalState = {
      base: state.base,
      shoulder: 180 - state.shoulder, // Inverted for hardware
      elbow: 180 - state.elbow,      // Inverted for hardware
      pickup: state.pickup            
    };
    set(ref(database, 'REAT_Arm_State'), physicalState);
  }, [database]);

  const handleJoystickMove = (e: any) => {
    if (!isJoystickActive || !joystickRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const maxRadius = rect.width / 2;
    
    const normalizedX = Math.max(-1, Math.min(1, deltaX / maxRadius));
    const normalizedY = Math.max(-1, Math.min(1, deltaY / maxRadius));

    const newBase = Math.round(90 + normalizedX * 90);
    const newShoulder = Math.round(90 - normalizedY * 90);

    const newState = { ...localState, base: newBase, shoulder: newShoulder };
    setLocalState(newState);

    const now = Date.now();
    if (now - lastSentRef.current > THROTTLE_DELAY) {
      syncToFirebase(newState);
      lastSentRef.current = now;
    }
  };

  const handleElbowThrottle = (val: number) => {
    const newState = { ...localState, elbow: val };
    setLocalState(newState);
    const now = Date.now();
    if (now - lastSentRef.current > THROTTLE_DELAY) {
      syncToFirebase(newState);
      lastSentRef.current = now;
    }
  };

  const toggleClaw = () => {
    const newPickup = localState.pickup > 90 ? 0 : 180;
    const newState = { ...localState, pickup: newPickup };
    setLocalState(newState);
    syncToFirebase(newState);
    toast({ title: newPickup === 180 ? "Claw Locked" : "Claw Released", duration: 1000 });
  };

  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      if (isMuted) return;
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.includes('hi-IN')) || voices.find(v => v.lang.includes('en-IN'));
      if (hindiVoice) utterance.voice = hindiVoice;
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  }, [isMuted]);

  const processCommand = async (transcript: string) => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: transcript };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: transcript, currentState: localState, history: messages.slice(-5) }),
      });
      const data = await response.json();
      if (data.state) {
        setLocalState(data.state);
        syncToFirebase(data.state);
      }
      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: data.reply || "Done Boss!" };
      setMessages(prev => [...prev, assistantMsg]);
      setIsProcessing(false);
      speak(assistantMsg.content);
    } catch (error) {
      setIsProcessing(false);
    }
  };

  const startRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.onstart = () => { setIsHolding(true); currentTranscriptRef.current = ''; };
    recognition.onresult = (event: any) => { currentTranscriptRef.current = event.results[0][0].transcript; };
    recognition.onend = () => { setIsHolding(false); processCommand(currentTranscriptRef.current); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMessages(JSON.parse(saved));
    else setMessages([{ id: '1', role: 'assistant', content: "REVO Analog cockpit online. Kya hukum hai, Boss?" }]);
  }, []);

  useEffect(() => {
    if (messages.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  return (
    <div className="min-h-screen bg-[#0a0f14] flex flex-col p-4 md:p-8 font-sans text-white overflow-hidden relative">
      <div className="hex-bg" />
      <div className="angular-pattern" />
      <div className="scanline" />

      <nav className="flex justify-between items-center mb-10 border-b-2 border-yellow-500/30 pb-6 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="border border-yellow-500/20 hover:bg-yellow-500/10">
              <ArrowLeft className="text-yellow-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-widest text-white uppercase glow-text-gold">REVO</h1>
            <span className="text-[9px] text-yellow-500/80 uppercase font-black tracking-[0.2em]">Analog System Link</span>
          </div>
        </div>
        <div className="hidden md:flex gap-10 items-center">
          <div className="text-right">
            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block">Link Latency</span>
            <span className="text-xs text-zinc-300 font-mono flex items-center gap-2">ULTRA_LOW <Activity size={14} className="text-yellow-500" /></span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Card className="glass-card industrial-border flex-grow flex flex-col p-8 items-center justify-center relative bg-black/40">
            <div className="absolute top-4 left-4 flex gap-6">
               <div className="flex flex-col"><span className="text-[8px] text-zinc-500 font-black uppercase">Base</span><span className="text-xs font-mono text-yellow-500">{localState.base}°</span></div>
               <div className="flex flex-col"><span className="text-[8px] text-zinc-500 font-black uppercase">Shoulder</span><span className="text-xs font-mono text-yellow-500">{localState.shoulder}°</span></div>
            </div>

            {/* Analog Joystick */}
            <div 
              ref={joystickRef}
              onMouseDown={() => setIsJoystickActive(true)}
              onMouseUp={() => setIsJoystickActive(false)}
              onMouseLeave={() => setIsJoystickActive(false)}
              onMouseMove={handleJoystickMove}
              onTouchStart={() => setIsJoystickActive(true)}
              onTouchEnd={() => setIsJoystickActive(false)}
              onTouchMove={handleJoystickMove}
              className="w-72 h-72 md:w-96 md:h-96 rounded-full border-4 border-yellow-500/20 bg-black/40 shadow-[inset_0_0_50px_rgba(255,191,0,0.05)] flex items-center justify-center relative cursor-move group"
            >
              <div className="absolute inset-0 rounded-full border border-yellow-500/10 animate-pulse" />
              <div className="w-px h-full bg-yellow-500/10 absolute left-1/2" />
              <div className="h-px w-full bg-yellow-500/10 absolute top-1/2" />
              
              <div 
                className={cn(
                  "w-20 h-20 md:w-24 md:h-24 rounded-full bg-yellow-500 border-4 border-black/50 shadow-[0_0_30px_rgba(255,191,0,0.4)] flex items-center justify-center transition-transform duration-75",
                  isJoystickActive ? "scale-95 bg-yellow-400" : "hover:bg-yellow-400"
                )}
                style={{
                  transform: `translate(${(localState.base - 90) * 1.2}px, ${(90 - localState.shoulder) * 1.2}px)`
                }}
              >
                <Move className="text-black w-8 h-8" />
              </div>
            </div>

            <div className="mt-12 flex gap-12 items-center">
               <div className="flex flex-col items-center gap-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Elbow Reach</span>
                  <div className="h-48 w-8 bg-zinc-900 rounded-full relative border border-yellow-500/10 p-1">
                     <input 
                      type="range" min="0" max="180" step="1" value={localState.elbow}
                      onInput={(e) => handleElbowThrottle(parseInt((e.target as HTMLInputElement).value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any}
                     />
                     <div className="absolute bottom-1 left-1 right-1 bg-yellow-500/20 rounded-full transition-all" style={{ height: `${(localState.elbow/180)*100}%` }} />
                     <div className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-yellow-500 border-2 border-black shadow-[0_0_10px_yellow]" style={{ bottom: `calc(${(localState.elbow/180)*100}% - 10px)` }} />
                  </div>
                  <span className="font-mono text-xs text-yellow-500">{localState.elbow}°</span>
               </div>

               <div className="flex flex-col items-center gap-6">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Pickup Toggle</span>
                  <Button 
                    onClick={toggleClaw}
                    className={cn(
                      "w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-3 border-4 transition-all active:scale-95",
                      localState.pickup > 90 
                        ? "bg-yellow-500 text-black border-yellow-600 shadow-[0_10px_30px_rgba(255,191,0,0.2)]" 
                        : "bg-black/40 text-yellow-500 border-yellow-500/20 hover:border-yellow-500/50"
                    )}
                  >
                    {localState.pickup > 90 ? <Lock size={32} /> : <Unlock size={32} />}
                    <span className="text-[9px] font-black uppercase tracking-tighter">{localState.pickup > 90 ? 'LOCKED' : 'RELEASED'}</span>
                  </Button>
               </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
           <Card className="glass-card industrial-border flex-grow flex flex-col overflow-hidden bg-black/40">
              <CardHeader className="border-b border-yellow-500/10 p-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot size={20} className="text-yellow-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Jarvis AI</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="w-8 h-8">
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </Button>
              </CardHeader>
              <CardContent className="flex-grow p-0">
                <ScrollArea className="h-[300px] md:h-[400px] p-4" ref={scrollRef}>
                   <div className="space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                          <div className={cn(
                            "max-w-[85%] px-4 py-2 rounded-lg text-xs leading-relaxed border",
                            msg.role === 'user' ? "bg-yellow-500 text-black border-transparent font-bold" : "bg-zinc-900/80 text-zinc-300 border-white/5"
                          )}>{msg.content}</div>
                        </div>
                      ))}
                      {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
                   </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-6 border-t border-yellow-500/10 bg-black/40 flex flex-col items-center gap-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-yellow-500 animate-pulse">
                    {isProcessing ? "PROCESSING" : (isHolding ? "LISTENING" : "HOLD TO COMMAND")}
                  </p>
                  <Button
                    onMouseDown={startRecognition}
                    onMouseUp={() => recognitionRef.current?.stop()}
                    onTouchStart={startRecognition}
                    onTouchEnd={() => recognitionRef.current?.stop()}
                    disabled={isProcessing}
                    className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500",
                      isHolding ? "bg-yellow-500 text-black scale-105" : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                    )}
                  >
                    <MicIcon size={24} />
                  </Button>
              </CardFooter>
           </Card>

           <Card className="glass-card industrial-border p-5 bg-black/40">
              <h4 className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.3em] mb-4 flex items-center gap-2">
                <Terminal size={12} className="text-yellow-500" /> System Telemetry
              </h4>
              <div className="grid grid-cols-2 gap-4">
                 {[
                   { l: 'SIGNAL', v: '98%', c: 'text-green-500' },
                   { l: 'VOLTS', v: '11.8V', c: 'text-yellow-500' },
                   { l: 'CORE', v: '32°C', c: 'text-zinc-300' },
                   { l: 'SYNC', v: '60Hz', c: 'text-zinc-300' }
                 ].map(t => (
                   <div key={t.l} className="p-2 border border-white/5 rounded bg-black/20">
                      <span className="text-[7px] text-zinc-600 font-black uppercase block mb-1">{t.l}</span>
                      <span className={cn("text-[10px] font-mono", t.c)}>{t.v}</span>
                   </div>
                 ))}
              </div>
           </Card>
        </div>
      </div>
      
      <footer className="mt-8 flex justify-between items-center text-[9px] text-zinc-600 font-black uppercase tracking-[0.4em] border-t border-zinc-900 pt-6 relative z-10">
        <div className="flex gap-12">
          <span>REVO ANALOG LINK ACTIVE</span>
          <span>© 2026 REVO SMART SYSTEMS</span>
        </div>
        <div className="flex gap-2 items-center">
           <ShieldCheck size={12} className="text-yellow-500" />
           <span>USER: ATHARVA_ATKAR</span>
        </div>
      </footer>
    </div>
  );
}
