import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Lock, MessageSquare, Monitor, User, Image as ImageIcon, ExternalLink, Check } from 'lucide-react';
import axios from 'axios';
import { Socket } from 'socket.io-client';

interface TicketChatModalProps {
  ticket: any;
  currentUser: any;
  socket: Socket | null;
  onClose: () => void;
  onTicketUpdated?: () => void;
}

export default function TicketChatModal({
  ticket,
  currentUser,
  socket,
  onClose,
  onTicketUpdated
}: TicketChatModalProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedAnydesk, setCopiedAnydesk] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showFullResolutionImage, setShowFullResolutionImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isTechOrAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Técnico IT';

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/tickets/${ticket.id}/messages?role=${currentUser.role}&userId=${currentUser.id}`);
      setMessages(res.data);
    } catch (err: any) {
      console.error('Error cargando mensajes del ticket:', err);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (socket) {
      const handleIncomingMessage = (data: { ticketId: string; message: any }) => {
        if (data.ticketId === ticket.id) {
          // Si el usuario es Solicitante y el mensaje es interno, ignorarlo
          if (currentUser.role === 'Solicitante' && data.message.isInternal) return;
          setMessages((prev) => [...prev, data.message]);
        }
      };

      socket.on('ticket:message', handleIncomingMessage);
      return () => {
        socket.off('ticket:message', handleIncomingMessage);
      };
    }
  }, [ticket.id, socket, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await axios.post(`/api/tickets/${ticket.id}/messages`, {
        message: newMessage.trim(),
        userId: currentUser.id,
        isInternal: isTechOrAdmin ? isInternal : false
      });
      setNewMessage('');
      setIsInternal(false);
      if (onTicketUpdated) onTicketUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al enviar mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const copyAnydesk = () => {
    if (ticket.remoteId) {
      navigator.clipboard.writeText(ticket.remoteId);
      setCopiedAnydesk(true);
      setTimeout(() => setCopiedAnydesk(false), 2000);
    }
  };

  const priorityColors: Record<string, string> = {
    Urgente: 'bg-red-500/20 text-red-400 border-red-500/40 glow-neon',
    Alta: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    Media: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    Baja: 'bg-slate-500/20 text-slate-300 border-slate-500/40'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-900/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-brand-blue-800 border border-brand-blue-700 rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Cabecera del Ticket */}
        <div className="bg-brand-blue-900/80 p-4 border-b border-brand-blue-700 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-black text-brand-neon text-lg">#{ticket.correlative || 0}</span>
              <h2 className="text-xl font-bold text-white leading-tight">{ticket.title}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${priorityColors[ticket.priority] || priorityColors.Media}`}>
                {ticket.priority || 'Media'}
              </span>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs font-bold">
                {ticket.status}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
              <span><strong>Solicitante:</strong> {ticket.user?.fullName} ({ticket.user?.gerencia || 'S/G'})</span>
              <span><strong>Técnico:</strong> {ticket.tech ? ticket.tech.fullName : <span className="text-yellow-400">Sin asignar</span>}</span>
              <span><strong>Fecha:</strong> {new Date(ticket.createdAt).toLocaleString('es-VE', { hour12: true })}</span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-brand-blue-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors shrink-0 ml-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Soporte Remoto AnyDesk (si está presente) */}
        {ticket.remoteId && (
          <div className="bg-brand-blue-900/50 px-4 py-2.5 border-b border-brand-blue-700 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Monitor size={18} className="text-brand-neon" />
              <span>Soporte Remoto (AnyDesk / RustDesk):</span>
              <code className="bg-brand-blue-900 px-2 py-0.5 rounded text-brand-neon font-mono font-bold tracking-wider">
                {ticket.remoteId}
              </code>
            </div>
            <button
              onClick={copyAnydesk}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1 bg-brand-blue-700 hover:bg-brand-blue-600 text-white rounded-lg transition-all"
            >
              {copiedAnydesk ? <Check size={14} className="text-green-400" /> : <ExternalLink size={14} />}
              {copiedAnydesk ? '¡Copiado!' : 'Copiar ID'}
            </button>
          </div>
        )}

        {/* Contenedor central: Scroll de Mensajes e Historial */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-blue-900/30">
          
          {/* Descripción Inicial del Requerimiento */}
          <div className="bg-brand-blue-800/80 border border-brand-blue-700 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-brand-neon font-bold mb-2">
              <User size={14} /> Solicitud Inicial de {ticket.user?.fullName}
            </div>
            <p className="text-white text-sm whitespace-pre-wrap">{ticket.description}</p>
            
            {ticket.imageUrl && (
              <div className="mt-3">
                <button
                  onClick={() => setShowFullImage(true)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-brand-neon bg-brand-blue-900/70 border border-brand-blue-600 px-3 py-1.5 rounded-lg hover:border-brand-neon transition-colors"
                >
                  <ImageIcon size={14} /> Ver Imagen Adjunta
                </button>
              </div>
            )}
          </div>

          {/* Modal de Imagen Completa */}
          {showFullImage && ticket.imageUrl && (
            <div
              onClick={() => setShowFullImage(false)}
              className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            >
              <div className="relative max-w-4xl max-h-[90vh]">
                <img src={ticket.imageUrl} alt="Adjunto" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
                <p className="text-center text-xs text-slate-400 mt-2">Haz clic en cualquier lugar para cerrar</p>
              </div>
            </div>
          )}

          {/* Informe de Solución y Evidencia del Técnico */}
          {(ticket.resolutionNotes || ticket.resolutionImageUrl) && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                  <Check size={16} /> Solución Registrada por {ticket.tech?.fullName || 'Técnico IT'}
                </div>
                {ticket.rating && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold">
                    ⭐ {ticket.rating}/5 estrellas {ticket.status.includes('Conforme') ? '(Conforme)' : ''}
                  </span>
                )}
              </div>
              {ticket.resolutionNotes && (
                <p className="text-emerald-100 text-sm whitespace-pre-wrap">{ticket.resolutionNotes}</p>
              )}
              {ticket.resolutionImageUrl && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowFullResolutionImage(true)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-900/60 border border-emerald-500/50 px-3 py-1.5 rounded-lg hover:border-emerald-300 transition-colors"
                  >
                    <ImageIcon size={14} /> Ver Evidencia de Solución
                  </button>
                </div>
              )}
              {ticket.ratingFeedback && (
                <div className="mt-2.5 pt-2 border-t border-emerald-500/20 text-xs text-slate-300 italic">
                  <strong>Opinión del solicitante:</strong> "{ticket.ratingFeedback}"
                </div>
              )}
            </div>
          )}

          {/* Modal de Evidencia de Solución Completa */}
          {showFullResolutionImage && ticket.resolutionImageUrl && (
            <div
              onClick={() => setShowFullResolutionImage(false)}
              className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            >
              <div className="relative max-w-4xl max-h-[90vh]">
                <img src={ticket.resolutionImageUrl} alt="Evidencia de Solución" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
                <p className="text-center text-xs text-slate-400 mt-2">Haz clic en cualquier lugar para cerrar</p>
              </div>
            </div>
          )}

          {/* Lista de Mensajes del Hilo */}
          {messages.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
              <MessageSquare size={16} /> No hay mensajes adicionales en este requerimiento aún.
            </div>
          ) : (
            messages.map((m) => {
              const isSenderMe = m.userId === currentUser.id;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isSenderMe ? 'items-end' : 'items-start'} animate-fade-in`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">{m.user?.fullName || 'Usuario'}</span>
                    <span className="text-[10px] text-slate-500">({m.user?.role})</span>
                    <span>&bull;</span>
                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md whitespace-pre-wrap ${
                      m.isInternal
                        ? 'bg-amber-950/40 border border-amber-500/40 text-amber-200'
                        : isSenderMe
                        ? 'bg-brand-blue-700 text-white border border-brand-blue-600 rounded-tr-none'
                        : 'bg-brand-blue-800 text-slate-200 border border-brand-blue-700 rounded-tl-none'
                    }`}
                  >
                    {m.isInternal && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                        <Lock size={12} /> Nota Interna (Privada para TI)
                      </div>
                    )}
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Formulario de Envío de Mensajes */}
        <div className="p-3 bg-brand-blue-900/90 border-t border-brand-blue-700 shrink-0">
          <form onSubmit={handleSendMessage} className="space-y-2">
            
            {/* Opción de Nota Interna (Solo Técnicos y Super Admin) */}
            {isTechOrAdmin && (
              <div className="flex items-center justify-between px-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded border-brand-blue-600 bg-brand-blue-900 text-brand-neon focus:ring-0 focus:ring-offset-0"
                  />
                  <span className={`font-semibold flex items-center gap-1 ${isInternal ? 'text-amber-400' : 'text-slate-400'}`}>
                    <Lock size={12} /> Nota Interna (Solo visible para Técnicos y Administradores)
                  </span>
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isInternal ? 'Escribe una nota técnica confidencial...' : 'Escribe una respuesta o consulta...'}
                className={`flex-1 bg-brand-blue-900 border rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors ${
                  isInternal
                    ? 'border-amber-500/50 focus:border-amber-400'
                    : 'border-brand-blue-700 focus:border-brand-neon'
                }`}
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className={`px-5 py-3 rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isInternal
                    ? 'bg-amber-500 hover:bg-amber-400 text-brand-blue-900'
                    : 'bg-brand-neon hover:bg-green-400 text-brand-blue-900 shadow-[0_0_15px_rgba(57,255,20,0.3)]'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
