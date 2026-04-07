'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Mic, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppContext } from '@/lib/context';
import { getAssistantResponse } from '@/app/ai-actions';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm Eco, your friendly AI assistant. Ask me anything about your factory's carbon data!",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { state: { operationalData } } = useAppContext();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);
  
  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
        speechSynthesis.cancel();
    };
  }, []);


  const handleToggle = () => {
    setIsOpen(prev => !prev);
    if (isOpen) { // If closing, stop any ongoing speech
        speechSynthesis.cancel();
    }
  };

  const speak = (text: string) => {
    if (isMuted || !text) return;
    speechSynthesis.cancel(); // Cancel previous utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2; // Make the voice speak faster
    speechSynthesis.speak(utterance);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    speechSynthesis.cancel(); // Stop any current speech on new submission

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue,
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
        const aiResponseContent = await getAssistantResponse(newMessages.map(m => ({role: m.role, content: m.content})), operationalData);
        
        const aiResponse: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: aiResponseContent,
        };

        setMessages(prev => [...prev, aiResponse]);
        speak(aiResponseContent);

    } catch (error) {
        console.error("Failed to get AI response:", error);
        const errorResponse: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: "Sorry, I'm having a bit of trouble thinking right now. Please try again in a moment.",
        };
        setMessages(prev => [...prev, errorResponse]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button onClick={handleToggle} size="lg" className={cn("rounded-full w-16 h-16 shadow-lg transition-all duration-300 ease-in-out", isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100')}>
          <Bot className="w-8 h-8" />
        </Button>
      </div>

      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-full max-w-sm transition-all duration-300 ease-in-out",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        <Card className="flex flex-col h-[600px] shadow-2xl">
          <CardHeader className="flex flex-row items-start">
            <div className="flex-grow">
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>Your guide to carbon intelligence.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsMuted(m => !m)} className="-mt-2" title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleToggle} className="-mt-2 -mr-2">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-start gap-3",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                        <Avatar className="w-8 h-8 border">
                            <AvatarFallback><Bot size={18}/></AvatarFallback>
                        </Avatar>
                    )}
                     <div
                      className={cn(
                        "max-w-xs rounded-lg px-4 py-2 text-sm",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.content}
                    </div>
                     {message.role === 'user' && (
                        <Avatar className="w-8 h-8 border">
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                    )}
                  </div>
                ))}
                 {isLoading && (
                  <div className="flex items-start gap-3 justify-start">
                     <Avatar className="w-8 h-8 border">
                        <AvatarFallback><Bot size={18}/></AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-4 py-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
              <Button variant="ghost" size="icon" type="button" disabled>
                <Mic className="w-4 h-4" />
              </Button>
              <Input
                autoComplete="off"
                placeholder="Ask anything..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
