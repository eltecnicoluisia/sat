import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Message {
  id: string;
  role: 'user' | 'pymi';
  content: string;
  timestamp: Date;
}

interface PymiWidgetProps {
  currentUser: any;
}

export default function PymiWidget({ currentUser }: PymiWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'pymi',
      content: `¡Hola ${currentUser?.fullName?.split(' ')[0] || ''}! Soy PYMI 🤖, el Técnico Virtual de SAT. ¿En qué te puedo ayudar hoy?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGreetingBubble, setShowGreetingBubble] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mostrar saludo 1 segundo después de cargar
    const timer = setTimeout(() => setShowGreetingBubble(true), 1000);
    // Ocultarlo 15 segundos después
    const hideTimer = setTimeout(() => setShowGreetingBubble(false), 15000);
    return () => { clearTimeout(timer); clearTimeout(hideTimer); };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Formatear el historial para enviarlo, excluyendo el saludo inicial y el mensaje actual
      const historyToSend = messages
        .filter((_, index) => index !== 0) // Gemini requiere que el historial empiece con 'user' o esté vacío al principio
        .map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await axios.post('/api/pymi/chat', {
        message: userMsg.content,
        history: historyToSend,
        context: {
          fullName: currentUser?.fullName,
          role: currentUser?.role
        }
      });

      const pymiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'pymi',
        content: response.data.reply || 'Lo siento, tuve un pequeño problema de conexión neuronal.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, pymiMsg]);
    } catch (error) {
      console.error("Error communicating with PYMI:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'pymi',
        content: 'Hubo un error de conexión con mi servidor. Por favor, intenta de nuevo en un momento.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botón Flotante con Saludo */}
      <div className={`fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 flex flex-col items-end transition-all duration-300 ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}>
        {/* Burbuja de Saludo Inicial */}
        {showGreetingBubble && (
          <div 
            className="mb-4 bg-brand-blue-900 border border-brand-neon rounded-2xl p-3 shadow-[0_0_20px_rgba(57,255,20,0.3)] text-sm text-slate-200 relative cursor-pointer hover:scale-105 transition-transform origin-bottom-right animate-slide-in"
            onClick={() => { setIsOpen(true); setShowGreetingBubble(false); }}
          >
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 bg-brand-neon rounded-full animate-pulse shadow-[0_0_8px_rgba(57,255,20,1)]"></span>
              ¡Hola, {currentUser?.fullName?.split(' ')[0] || ''}! 👋 ¿Necesitas ayuda?
            </div>
            {/* Triangulito de la burbuja */}
            <div className="absolute -bottom-2 right-5 w-4 h-4 bg-brand-blue-900 border-b border-r border-brand-neon transform rotate-45"></div>
          </div>
        )}

        <button
          onClick={() => { setIsOpen(true); setShowGreetingBubble(false); }}
          className="w-16 h-16 bg-brand-neon hover:bg-green-400 text-brand-blue-900 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(57,255,20,0.5)] transition-colors animate-bot-bounce"
          title="Hablar con PYMI"
        >
          <Bot size={32} />
        </button>
      </div>

      {/* Ventana de Chat */}
      <div className={`fixed bottom-0 right-0 sm:bottom-6 sm:right-6 lg:bottom-10 lg:right-10 w-full sm:w-96 h-full sm:h-[600px] bg-brand-blue-900 sm:rounded-2xl border border-brand-blue-700 shadow-2xl flex flex-col z-50 transition-all duration-300 transform origin-bottom-right ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 pointer-events-none translate-y-10'}`}>
        
        {/* Cabecera del Chat */}
        <div className="bg-brand-blue-800 p-4 sm:rounded-t-2xl border-b border-brand-blue-700 flex justify-between items-center shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-neon/20 rounded-full flex items-center justify-center border border-brand-neon/50">
              <Bot size={22} className="text-brand-neon" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">PYMI</h3>
              <p className="text-brand-neon text-xs font-medium flex items-center">
                <span className="w-2 h-2 bg-brand-neon rounded-full mr-1 animate-pulse"></span>
                Técnico Virtual Activo
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-brand-blue-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors border border-transparent hover:border-red-500/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Área de Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-brand-blue-900/50 relative">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-auto ${msg.role === 'user' ? 'bg-brand-blue-700 border border-brand-blue-600' : 'bg-brand-neon/20 border border-brand-neon/50'}`}>
                  {msg.role === 'user' ? <User size={14} className="text-slate-300" /> : <Bot size={16} className="text-brand-neon" />}
                </div>
                
                {/* Burbuja de Mensaje */}
                <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-blue-700 text-white rounded-br-none border border-brand-blue-600' 
                    : 'bg-brand-blue-800 text-slate-200 rounded-bl-none border border-brand-blue-700'
                }`}>
                  {msg.content}
                  <div className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-blue-200/50' : 'text-slate-500'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex w-full justify-start animate-fade-in">
              <div className="flex gap-2 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-brand-neon/20 border border-brand-neon/50 flex items-center justify-center shrink-0 mt-auto">
                  <Bot size={16} className="text-brand-neon" />
                </div>
                <div className="bg-brand-blue-800 text-slate-400 p-3 rounded-2xl rounded-bl-none border border-brand-blue-700 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-brand-neon" />
                  <span className="text-xs">PYMI está escribiendo...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Área de Input */}
        <div className="p-3 bg-brand-blue-800 sm:rounded-b-2xl border-t border-brand-blue-700 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pregúntale a PYMI..."
              className="flex-1 bg-brand-blue-900 border border-brand-blue-700 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-neon focus:ring-1 focus:ring-brand-neon transition-all"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="w-12 h-12 bg-brand-neon hover:bg-green-400 disabled:bg-brand-blue-700 disabled:text-slate-500 text-brand-blue-900 rounded-xl flex items-center justify-center transition-all disabled:cursor-not-allowed"
            >
              <Send size={18} className={inputValue.trim() && !isLoading ? 'ml-1' : ''} />
            </button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-500">PYMI IA &bull; Powered by SAT</p>
          </div>
        </div>
      </div>
    </>
  );
}
