import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, X, Maximize2, Minimize2, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isAgent: boolean;
}

const MissionChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  // Persistens: Ladda från localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mission_chat_history');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  // Spara till localStorage
  useEffect(() => {
    localStorage.setItem('mission_chat_history', JSON.stringify(messages));
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'Jonas',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAgent: false
    };

    setMessages([...messages, newUserMsg]);
    setInput('');

    // Mock-svar på Svenska (tills vi kopplar API)
    setTimeout(() => {
      const resp: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'Antigravity',
        text: 'Jag har tagit emot ditt meddelande. Ska jag skapa ett kort av detta i Kanban-tavlan?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAgent: true
      };
      setMessages((prev: Message[]) => [...prev, resp]);
    }, 1000);
  };

  const convertToTask = (text: string) => {
    console.log("Konverterar till task:", text);
    // Logik för att uppdatera tasks.json kommer här
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Senaste meddelanden (mini-view) */}
      {!isOpen && messages.length > 0 && (
        <div className="flex flex-col gap-2 mb-2 items-end">
          {messages.slice(-3).map((m: Message) => (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              key={m.id} 
              className="glass-card px-3 py-1.5 text-xs max-w-[200px] border-primary/20"
            >
              <span className="font-bold text-primary mr-1">{m.sender}:</span>
              {m.text}
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card w-80 h-[450px] flex flex-col shadow-2xl relative overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Mission Chat</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsOpen(false)}><X className="w-4 h-4 hover:text-primary transition-colors" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m: Message) => (
                <div key={m.id} className={`flex flex-col ${m.isAgent ? 'items-start' : 'items-end'}`}>
                  <div className={`px-3 py-2 rounded-xl text-sm ${m.isAgent ? 'bg-white/10' : 'bg-primary/20 border border-primary/30'} max-w-[85%] relative group`}>
                    {m.text}
                    {m.isAgent && (
                      <button 
                        onClick={() => convertToTask(m.text)}
                        className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Skapa Kanban-kort"
                      >
                        <PlusSquare className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">{m.sender} • {m.time}</span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Skriv till agenterna..." 
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs flex-1 focus:outline-none focus:border-primary/50"
                />
                <button onClick={handleSend} className="bg-primary hover:bg-primary-dark p-2 rounded-lg transition-colors">
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </button>
    </div>
  );
};

export default MissionChat;
