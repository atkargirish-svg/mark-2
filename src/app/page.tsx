'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { ref, set } from 'firebase/database';
import { MicIcon, Sliders, Bot, Activity, Circle, Loader2, ShieldCheck, Volume2, VolumeX, RotateCcw, Smartphone, Target, Move, Lock, Unlock, Gamepad2, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/tabs-ui';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ArmState, ChatMessage } from '@/lib/types';
import { DEFAULT_ARM_STATE } from '@/lib/types';

const STORAGE_KEY = 'revo_industrial_v28';

const LANGUAGES = [
  { id: 'English', label: 'English' },
  { id: 'Hindi', label: 'हिन्दी (Hindi)' },
  { id: 'Marathi', label: 'मराठी (Marathi)' },
  { id: 'Gujarati', label: 'ગુજરાતી (Gujarati)' },
  { id: 'Bengali', label: 'বাংলা (Bengali)' },
  { id: 'Tamil', label: 'தமிழ் (Tamil)' },
  { id: 'Telugu', label: 'తెలుగు (Telugu)' },
  { id: 'Punjabi', label: 'ਪੰਜਾਬੀ (Punjabi)' },
];

export default function REVOConsole() {
  const { database } = useFirebase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHolding, setIsHolding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('jarvis');
  const [isLevelLock, setIsLevelLock] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('Hindi');
  const { toast } = useToast();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentTranscriptRef = useRef('');
  const [localState, setLocalState] = useState<ArmState>(DEFAULT_ARM_STATE);
  const lastSentRef = useRef<number>(0);
  const introIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const THROTTLE_DELAY = 50;

  // Joystick refs
  const joystickRef = useRef<HTMLDivElement>(null);
  const [isJoystickActive, setIsJoystickActive] = useState(false);

  // Gyro state
  const [isGyroActive, setIsGyroActive] = useState(false);
  const [gyroOffset, setGyroOffset] = useState({ beta: 0, gamma: 0 });
  const [currentOrientation, setCurrentOrientation] = useState({ beta: 0, gamma: 0 });

  const syncToFirebase = useCallback((state: ArmState) => {
    if (!database) return;
    const physicalState = {
      base: Math.round(state.base),
      shoulder: Math.round(180 - state.shoulder), 
      elbow: Math.round(180 - state.elbow),      
      pickup: Math.round(state.pickup)            
    };
    set(ref(database, 'REAT_Arm_State'), physicalState);
  }, [database]);

  const handleManualControl = (key: keyof ArmState, value: number) => {
    const newState = { ...localState, [key]: value };
    setLocalState(newState);
    const now = Date.now();
    if (now - lastSentRef.current > THROTTLE_DELAY) {
      syncToFirebase(newState);
      lastSentRef.current = now;
    }
  };

  const handleReset = useCallback(() => {
    setLocalState(DEFAULT_ARM_STATE);
    syncToFirebase(DEFAULT_ARM_STATE);
    toast({ title: "System Homing Complete" });
  }, [syncToFirebase, toast]);

  const toggleClaw = () => {
    const newPickup = localState.pickup > 90 ? 0 : 180;
    handleManualControl('pickup', newPickup);
  };

  // Intro Interaction Logic
  const startIntroGestures = () => {
    // 1. Reset all motors to home first
    const homeState = { ...DEFAULT_ARM_STATE, pickup: 0 };
    setLocalState(homeState);
    syncToFirebase(homeState);

    // 2. Start claw open/close loop (1 sec delay)
    let currentClaw = 0;
    if (introIntervalRef.current) clearInterval(introIntervalRef.current);
    
    introIntervalRef.current = setInterval(() => {
      currentClaw = currentClaw === 0 ? 180 : 0;
      setLocalState(prev => {
        const updated = { ...prev, pickup: currentClaw };
        syncToFirebase(updated);
        return updated;
      });
    }, 1000);
  };

  const stopIntroGestures = () => {
    if (introIntervalRef.current) {
      clearInterval(introIntervalRef.current);
      introIntervalRef.current = null;
    }
    // Return claw to default open
    handleManualControl('pickup', 0);
  };

  // Joystick Logic
  const handleJoystickMove = (e: any) => {
    if (!isJoystickActive || !joystickRef.current) return;
    if (e.cancelable) e.preventDefault();

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

    const newBase = 90 + normalizedX * 90;
    const newShoulder = 90 - normalizedY * 90;

    let newElbow = localState.elbow;
    if (isLevelLock) {
      const shoulderDiff = newShoulder - localState.shoulder;
      newElbow = Math.max(0, Math.min(180, localState.elbow - shoulderDiff));
    }

    const newState = { ...localState, base: newBase, shoulder: newShoulder, elbow: newElbow };
    setLocalState(newState);

    const now = Date.now();
    if (now - lastSentRef.current > THROTTLE_DELAY) {
      syncToFirebase(newState);
      lastSentRef.current = now;
    }
  };

  // Advanced Gyro Logic
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (!isGyroActive || activeTab !== 'gyro') return;

    const beta = event.beta || 0; 
    const gamma = event.gamma || 0; 
    
    setCurrentOrientation({ beta, gamma });

    let relativeBeta = beta - gyroOffset.beta;
    let relativeGamma = gamma - gyroOffset.gamma;

    const DEADZONE = 4;
    const MAX_TILT = 45;

    if (Math.abs(relativeBeta) < DEADZONE) relativeBeta = 0;
    else relativeBeta = relativeBeta > 0 ? relativeBeta - DEADZONE : relativeBeta + DEADZONE;

    if (Math.abs(relativeGamma) < DEADZONE) relativeGamma = 0;
    else relativeGamma = relativeGamma > 0 ? relativeGamma - DEADZONE : relativeGamma + DEADZONE;

    const scaling = 90 / (MAX_TILT - DEADZONE);

    const newShoulder = Math.max(0, Math.min(180, 90 - relativeBeta * scaling));
    const newBase = Math.max(0, Math.min(180, 90 + relativeGamma * scaling));

    let newElbow = localState.elbow;
    if (isLevelLock) {
      const shoulderDiff = newShoulder - localState.shoulder;
      newElbow = Math.max(0, Math.min(180, localState.elbow - shoulderDiff));
    }

    if (Math.abs(newShoulder - localState.shoulder) > 1 || Math.abs(newBase - localState.base) > 1) {
      const newState = { ...localState, base: newBase, shoulder: newShoulder, elbow: newElbow };
      setLocalState(newState);

      const now = Date.now();
      if (now - lastSentRef.current > THROTTLE_DELAY) {
        syncToFirebase(newState);
        lastSentRef.current = now;
      }
    }
  }, [isGyroActive, activeTab, gyroOffset, localState, isLevelLock, syncToFirebase]);

  useEffect(() => {
    if (isGyroActive && activeTab === 'gyro') {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isGyroActive, activeTab, handleOrientation]);

  const requestGyroPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setIsGyroActive(true);
          toast({ title: "Motion Link Active" });
        }
      } catch (e) {
        toast({ title: "Permission Denied", variant: "destructive" });
      }
    } else {
      setIsGyroActive(true);
      toast({ title: "Motion Link Active" });
    }
  };

  const calibrateGyro = () => {
    setGyroOffset({ beta: currentOrientation.beta, gamma: currentOrientation.gamma });
    toast({ title: "Motion Calibrated" });
  };

  // AI & Voice
  const processCommand = async (transcript: string) => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: transcript };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: transcript, 
          currentState: localState, 
          history: messages.slice(-5),
          language: selectedLanguage 
        }),
      });
      const data = await response.json();
      
      if (data.state && !data.isIntro) {
        setLocalState(data.state);
        syncToFirebase(data.state);
      }

      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: data.reply || "Done Boss!" };
      setMessages(prev => [...prev, assistantMsg]);
      setIsProcessing(false);
      
      // Start Intro sequence if flag is set
      if (data.isIntro) startIntroGestures();
      
      speak(assistantMsg.content, data.isIntro);
    } catch (error) {
      setIsProcessing(false);
    }
  };

  const startRecognition = () => {
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = selectedLanguage === 'English' ? 'en-US' : 'hi-IN';
    recognition.onstart = () => { setIsHolding(true); currentTranscriptRef.current = ''; };
    recognition.onresult = (event: any) => { currentTranscriptRef.current = event.results[0][0].transcript; };
    recognition.onend = () => { setIsHolding(false); processCommand(currentTranscriptRef.current); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const speak = useCallback((text: string, isIntro: boolean = false) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      if (isMuted) return;
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      
      // Find matching voice for language
      const langCode = LANGUAGES.find(l => l.id === selectedLanguage)?.id || 'Hindi';
      const voice = voices.find(v => v.lang.startsWith(langCode.substring(0, 2).toLowerCase()));
      if (voice) utterance.voice = voice;
      
      utterance.rate = 1.0;
      utterance.onend = () => {
        if (isIntro) stopIntroGestures();
      };
      
      window.speechSynthesis.speak(utterance);
    }
  }, [isMuted, selectedLanguage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
      else setMessages([{ id: '1', role: 'assistant', content: "REVO Mark II Professional Console Online. Good day, Boss." }]);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
    if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  return (
    <div className="h-screen bg-[#0a0f14] flex flex-col p-4 md:p-6 font-sans text-white overflow-hidden relative">
      <div className="hex-bg" />
      <div className="angular-pattern" />
      <div className="scanline" />

      {/* Header with Language Selector */}
      <nav className="flex justify-between items-center mb-4 border-b border-yellow-500/20 pb-2 relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30">
            <Activity className="text-yellow-500 w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-widest text-white uppercase glow-text-gold">REVO</h1>
            <span className="text-[6px] text-yellow-500/80 uppercase font-black tracking-[0.2em]">Mark II Industrial</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 border border-yellow-500/20 px-2 py-1 rounded-lg">
            <Languages size={12} className="text-yellow-500" />
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="h-6 w-32 bg-transparent border-none text-[9px] font-black uppercase text-yellow-500 focus:ring-0">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-yellow-500/20 text-white">
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.id} value={lang.id} className="text-[10px] uppercase font-bold focus:bg-yellow-500 focus:text-black">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[6px] text-zinc-500 font-black uppercase tracking-widest">Link</span>
            <span className="text-[8px] text-green-500 font-mono flex items-center gap-1 uppercase">Active <Circle size={4} className="fill-green-500" /></span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-grow relative z-10 overflow-hidden flex flex-col items-center justify-center pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col items-center justify-center">
          
          {/* JARVIS AI */}
          <TabsContent value="jarvis" className="w-full max-w-lg h-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
             <Card className="w-full h-[65vh] glass-card industrial-border overflow-hidden flex flex-col bg-black/40">
                <CardHeader className="p-3 border-b border-yellow-500/10 flex flex-row items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Bot size={16} className="text-yellow-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Core Intelligence</span>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="w-8 h-8">
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                   </Button>
                </CardHeader>
                <CardContent className="flex-grow p-0 overflow-hidden">
                   <ScrollArea className="h-full p-4" ref={scrollRef}>
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div key={msg.id} className={cn("flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                              "max-w-[85%] px-4 py-2 rounded-xl text-xs leading-relaxed border",
                              msg.role === 'user' ? "bg-yellow-500 text-black border-transparent font-bold" : "bg-zinc-900/80 text-zinc-300 border-white/5"
                            )}>{msg.content}</div>
                          </div>
                        ))}
                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
                      </div>
                   </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 border-t border-yellow-500/10 bg-black/40 flex flex-col items-center gap-3 shrink-0">
                   <p className="text-[8px] font-black uppercase tracking-[0.3em] text-yellow-500 animate-pulse">
                      {isProcessing ? "PROCESSING" : (isHolding ? "LISTENING" : "HOLD TO COMMAND")}
                   </p>
                   <Button
                      onMouseDown={startRecognition} onMouseUp={() => recognitionRef.current?.stop()}
                      onTouchStart={startRecognition} onTouchEnd={() => recognitionRef.current?.stop()}
                      disabled={isProcessing}
                      className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl",
                        isHolding ? "bg-yellow-500 text-black scale-105" : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                      )}
                    >
                      <MicIcon size={20} />
                    </Button>
                </CardFooter>
             </Card>
          </TabsContent>

          {/* MANUAL - 2X2 GRID */}
          <TabsContent value="manual" className="w-full max-w-lg h-full flex flex-col items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="w-full space-y-4 px-2 flex flex-col items-center">
                <div className="grid grid-cols-2 gap-3 w-full">
                    {[
                      { id: 'base', label: 'SWIVEL' },
                      { id: 'shoulder', label: 'SHOULDER' },
                      { id: 'elbow', label: 'REACH' },
                      { id: 'pickup', label: 'CLAW' }
                    ].map((motor) => (
                      <Card key={motor.id} className="glass-card industrial-border p-3 bg-black/40 border-yellow-500/10">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">{motor.label}</span>
                            <span className="text-[10px] font-mono text-yellow-500">{Math.round(localState[motor.id as keyof ArmState])}°</span>
                         </div>
                         <input
                            type="range" min="0" max="180" step="1"
                            value={localState[motor.id as keyof ArmState]}
                            onInput={(e) => handleManualControl(motor.id as keyof ArmState, parseInt((e.target as HTMLInputElement).value))}
                            className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-yellow-500 cursor-pointer"
                          />
                      </Card>
                    ))}
                </div>
                
                <div className="grid grid-cols-2 gap-3 w-full">
                    <Button 
                      onClick={toggleClaw} 
                      className={cn(
                        "h-11 flex flex-col gap-0.5 font-black uppercase tracking-widest text-[8px] rounded-xl border-2 transition-all active:scale-95", 
                        localState.pickup > 90 
                          ? "bg-yellow-500 text-black border-yellow-600 shadow-lg" 
                          : "bg-zinc-900 text-yellow-500 border-yellow-500/20"
                      )}
                    >
                       {localState.pickup > 90 ? <Lock size={14} /> : <Unlock size={14} />}
                       {localState.pickup > 90 ? 'LOCK CLAW' : 'OPEN CLAW'}
                    </Button>
                    <Button 
                      onClick={handleReset} 
                      variant="outline" 
                      className="h-11 flex flex-col gap-0.5 font-black uppercase tracking-widest text-[8px] rounded-xl border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-yellow-500 hover:border-yellow-500 active:scale-95"
                    >
                       <RotateCcw size={14} />
                       RESET HOME
                    </Button>
                </div>

                <Card className="w-full glass-card industrial-border p-3 bg-black/40 border-yellow-500/5">
                    <div className="flex justify-between items-center">
                       <div className="flex gap-4">
                          <div className="flex flex-col">
                            <span className="text-[6px] text-zinc-600 font-bold uppercase">Signal</span>
                            <span className="text-[10px] font-mono text-green-500">STABLE</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[6px] text-zinc-600 font-bold uppercase">Battery</span>
                            <span className="text-[10px] font-mono text-yellow-500">12.4V</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/5 rounded-full border border-green-500/10">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[7px] font-black text-green-500 tracking-tighter">LINK ACTIVE</span>
                       </div>
                    </div>
                </Card>
             </div>
          </TabsContent>

          {/* ANALOG - JOYSTICK */}
          <TabsContent value="analog" className="w-full max-w-lg h-full flex flex-col items-center justify-center animate-in fade-in duration-300 touch-none select-none">
             <Card className="w-full glass-card industrial-border p-8 flex flex-col items-center gap-8 bg-black/40 relative">
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase text-zinc-500">Auto-Level</span>
                    <Switch checked={isLevelLock} onCheckedChange={setIsLevelLock} className="scale-75 data-[state=checked]:bg-yellow-500" />
                </div>

                <div 
                  ref={joystickRef}
                  onMouseDown={() => setIsJoystickActive(true)} onMouseUp={() => setIsJoystickActive(false)}
                  onMouseLeave={() => setIsJoystickActive(false)} onMouseMove={handleJoystickMove}
                  onTouchStart={() => setIsJoystickActive(true)} onTouchEnd={() => setIsJoystickActive(false)}
                  onTouchMove={handleJoystickMove}
                  className="w-60 h-60 rounded-full border-4 border-yellow-500/20 bg-black/40 shadow-[inset_0_0_40px_rgba(255,191,0,0.05)] flex items-center justify-center relative cursor-move"
                >
                  <div className="absolute inset-0 rounded-full border border-yellow-500/10 animate-pulse" />
                  <div className="w-px h-full bg-yellow-500/10 absolute left-1/2" />
                  <div className="h-px w-full bg-yellow-500/10 absolute top-1/2" />
                  
                  <div 
                    className={cn(
                      "w-16 h-16 rounded-full bg-yellow-500 border-2 border-black shadow-[0_0_25px_rgba(255,191,0,0.4)] flex items-center justify-center transition-transform duration-75",
                      isJoystickActive ? "scale-95 bg-yellow-400" : "hover:bg-yellow-400"
                    )}
                    style={{ transform: `translate(${(localState.base - 90) * 0.8}px, ${(90 - localState.shoulder) * 0.8}px)` }}
                  >
                    <Move className="text-black w-6 h-6" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-10 w-full">
                   <div className="flex flex-col items-center gap-3">
                      <span className="text-[8px] font-black uppercase text-zinc-500">Elbow Reach</span>
                      <div className="h-28 w-8 bg-zinc-900 rounded-full relative border border-yellow-500/10 p-1">
                         <input 
                          type="range" min="0" max="180" step="1" value={localState.elbow}
                          onInput={(e) => handleManualControl('elbow', parseInt((e.target as HTMLInputElement).value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any}
                         />
                         <div className="absolute bottom-1 left-1 right-1 bg-yellow-500/20 rounded-full transition-all" style={{ height: `${(localState.elbow/180)*100}%` }} />
                         <div className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-yellow-500 border-2 border-black shadow-[0_0_10px_yellow]" style={{ bottom: `calc(${(localState.elbow/180)*100}% - 10px)` }} />
                      </div>
                      <span className="font-mono text-[10px] text-yellow-500">{Math.round(localState.elbow)}°</span>
                   </div>

                   <div className="flex flex-col items-center justify-center gap-4">
                      <Button 
                        onClick={toggleClaw}
                        className={cn(
                          "w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all active:scale-95",
                          localState.pickup > 90 
                            ? "bg-yellow-500 text-black border-yellow-600 shadow-xl" 
                            : "bg-black/40 text-yellow-500 border-yellow-500/20"
                        )}
                      >
                        {localState.pickup > 90 ? <Lock size={24} /> : <Unlock size={24} />}
                        <span className="text-[8px] font-black uppercase tracking-tighter">{localState.pickup > 90 ? 'LOCKED' : 'FREE'}</span>
                      </Button>
                   </div>
                </div>
             </Card>
          </TabsContent>

          {/* GYRO - MOTION CONTROL */}
          <TabsContent value="gyro" className="w-full max-w-lg h-full flex flex-col items-center justify-center animate-in fade-in duration-300 touch-none select-none">
             <Card className="w-full glass-card industrial-border p-8 flex flex-col items-center justify-center gap-8 bg-black/40 relative">
                {!isGyroActive ? (
                   <div className="text-center space-y-6">
                      <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center border-2 border-yellow-500/20 mx-auto animate-pulse">
                         <Smartphone size={32} className="text-yellow-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-base font-black uppercase tracking-widest text-white">Motion Link Offline</h3>
                        <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Activate sensors for precision control</p>
                      </div>
                      <Button onClick={requestGyroPermission} className="bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase tracking-widest px-8 h-12 rounded-xl shadow-lg text-[9px]">
                         ACTIVATE SENSORS
                      </Button>
                   </div>
                ) : (
                   <div className="w-full space-y-8 flex flex-col items-center">
                      <div className="flex justify-between w-full">
                         <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase text-zinc-500">Tilt Tracking</span>
                            <span className="text-sm font-mono text-yellow-500 uppercase tracking-tighter">{Math.round(localState.base)}° B | {Math.round(localState.shoulder)}° S</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="text-[8px] font-black uppercase text-zinc-500">Auto-Level</span>
                            <Switch checked={isLevelLock} onCheckedChange={setIsLevelLock} className="scale-75 data-[state=checked]:bg-yellow-500" />
                         </div>
                      </div>

                      <div className="w-48 h-40 rounded-full border-4 border-yellow-500/20 bg-black/20 flex items-center justify-center relative overflow-hidden">
                         <div className="absolute inset-0 border border-white/5 rounded-full" />
                         <div className="absolute inset-[30%] border border-white/5 rounded-full" />
                         <div className="w-px h-full bg-white/5 absolute left-1/2" />
                         <div className="h-px w-full bg-white/5 absolute top-1/2" />
                         <div 
                           className="w-12 h-12 rounded-full bg-yellow-500 border-2 border-black shadow-[0_0_25px_rgba(255,191,0,0.5)] flex items-center justify-center transition-transform duration-100 ease-out"
                           style={{ transform: `translate(${(currentOrientation.gamma - gyroOffset.gamma) * 1.5}px, ${(currentOrientation.beta - gyroOffset.beta) * 1.5}px)` }}
                         >
                            <Target className="text-black w-6 h-6" />
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full">
                         <Button onClick={calibrateGyro} variant="outline" className="h-12 border-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-[8px] rounded-xl hover:text-white">
                            RE-CALIBRATE
                         </Button>
                         <Button onClick={toggleClaw} className={cn("h-12 font-black uppercase tracking-widest text-[8px] rounded-xl border-2 shadow-lg", localState.pickup > 90 ? "bg-yellow-500 text-black border-yellow-600" : "bg-zinc-900 text-yellow-500 border-yellow-500/20")}>
                            {localState.pickup > 90 ? 'LOCK CLAW' : 'FREE CLAW'}
                         </Button>
                      </div>

                      <Button variant="ghost" onClick={() => setIsGyroActive(false)} className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-600 hover:text-red-500">
                         DISCONNECT SENSOR LINK
                      </Button>
                   </div>
                )}
             </Card>
          </TabsContent>

          {/* FLOATING CYLINDRIC NAVIGATION */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md">
             <TabsList className="bg-[#111821]/95 border border-yellow-500/30 p-1 rounded-full shadow-[0_0_40px_rgba(255,191,0,0.15)] backdrop-blur-2xl flex gap-1 h-auto items-center justify-between">
                <TabsTrigger value="jarvis" className="rounded-full flex-1 h-11 data-[state=active]:bg-yellow-500 data-[state=active]:text-black transition-all">
                   <Bot size={16} className="md:mr-2" /> <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">Jarvis</span>
                </TabsTrigger>
                <TabsTrigger value="manual" className="rounded-full flex-1 h-11 data-[state=active]:bg-yellow-500 data-[state=active]:text-black transition-all">
                   <Sliders size={16} className="md:mr-2" /> <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">Manual</span>
                </TabsTrigger>
                <TabsTrigger value="analog" className="rounded-full flex-1 h-11 data-[state=active]:bg-yellow-500 data-[state=active]:text-black transition-all">
                   <Gamepad2 size={16} className="md:mr-2" /> <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">Analog</span>
                </TabsTrigger>
                <TabsTrigger value="gyro" className="rounded-full flex-1 h-11 data-[state=active]:bg-yellow-500 data-[state=active]:text-black transition-all">
                   <Smartphone size={16} className="md:mr-2" /> <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">Gyro</span>
                </TabsTrigger>
             </TabsList>
          </div>

        </Tabs>
      </div>

      {/* Footer */}
      <footer className="mt-2 flex justify-between items-center text-[7px] text-zinc-600 font-black uppercase tracking-[0.3em] relative z-10 shrink-0">
        <div className="flex gap-4">
          <span>REVO ACTIVE LINK</span>
          <span>© 2026 REVO SYSTEMS</span>
        </div>
        <div className="flex gap-2 items-center">
           <ShieldCheck size={10} className="text-yellow-500" />
           <span>ATHARVA_ATKAR</span>
        </div>
      </footer>
    </div>
  );
}
