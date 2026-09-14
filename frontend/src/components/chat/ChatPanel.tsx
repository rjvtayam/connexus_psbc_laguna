import { useState, useEffect, useRef, useCallback } from 'react';
import { X, MessageSquare, Send, Users, School, MessageCircle, Reply, CornerUpLeft, SmilePlus, AlertTriangle } from 'lucide-react';
import { getSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../stores/authStore';
import { useSessionStore, ChatMessage } from '../../stores/sessionStore';
import { chatReactionsApi, ChatReactionSummary } from '../../api/chatReactions.api';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDateSeparator(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const dayMs = 86400000;
  if (diff < dayMs && d.getDate() === now.getDate()) return 'Today';
  if (diff < dayMs * 2 && d.getDate() === now.getDate() - 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function isSameSender(a: ChatMessage, b: ChatMessage): boolean {
  return a.user === b.user && isSameDay(a.timestamp, b.timestamp);
}

const CHAT_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const LONG_PRESS_MS = 500;

function formatReactionTooltip(r: ChatReactionSummary, myName: string): string {
  const others = r.users.filter((u) => u !== myName);
  if (r.user_reacted) {
    if (others.length === 0) return 'You';
    if (others.length === 1) return `You and ${others[0]}`;
    if (others.length === 2) return `You, ${others[0]}, and ${others[1]}`;
    return `You, ${others[0]}, and ${others.length} others`;
  }
  if (r.users.length === 1) return r.users[0];
  if (r.users.length === 2) return `${r.users[0]} and ${r.users[1]}`;
  return `${r.users[0]}, ${r.users[1]}, and ${r.users.length - 2} others`;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'campus'>('all');
  const [campusTarget, setCampusTarget] = useState<'paete' | 'pagsanjan'>('paete');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [chatReactions, setChatReactions] = useState<Record<string, ChatReactionSummary[]>>({});
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const reactionsLoadedRef = useRef(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuthStore();
  const messages = useSessionStore((s) => s.chatMessages);
  const unreadAll = useSessionStore((s) => s.unreadAllCount);
  const unreadCampus = useSessionStore((s) => s.unreadCampusCount);
  const clearUnreadChat = useSessionStore((s) => s.clearUnreadChat);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isNearBottom = useRef(true);

  const isAdmin = user?.role === 'admin';
  const myCampus = user?.campus;
  const isControlRoom = myCampus === 'control_room';
  const effectiveCampus = isControlRoom ? campusTarget : (myCampus as 'paete' | 'pagsanjan');

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      clearUnreadChat(activeTab);
      reactionsLoadedRef.current = false;
      setTimeout(() => scrollToBottom(false), 50);
    } else {
      reactionsLoadedRef.current = false;
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (isNearBottom.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) clearUnreadChat(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail;
      setChatReactions((prev) => {
        const existing = prev[data.message_id] || [];
        const updated = existing.map((r) => {
          if (r.emoji === data.emoji) {
            if (data.action === 'added') {
              return { ...r, count: r.count + 1, users: [...r.users, data.user], user_reacted: r.user_reacted || data.user === user?.full_name };
            } else {
              const newUsers = r.users.filter((u: string) => u !== data.user);
              return { ...r, count: Math.max(0, r.count - 1), users: newUsers, user_reacted: data.user !== user?.full_name ? r.user_reacted : false };
            }
          }
          return r;
        });
        const exists = updated.find((r) => r.emoji === data.emoji);
        if (!exists && data.action === 'added') {
          updated.push({ emoji: data.emoji, count: 1, users: [data.user], user_reacted: data.user === user?.full_name });
        }
        return { ...prev, [data.message_id]: updated.filter((r) => r.count > 0) };
      });
    };
    window.addEventListener('chat_reaction_update', handler);
    return () => window.removeEventListener('chat_reaction_update', handler);
  }, [user?.full_name]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  const filteredMessages = messages.filter((msg) => {
    if (activeTab === 'all') return msg.target !== 'campus';
    const scope = msg.campus_scope || msg.campus;
    return msg.target === 'campus' && scope === effectiveCampus;
  });

  useEffect(() => {
    if (!isOpen || reactionsLoadedRef.current || filteredMessages.length === 0) return;
    const ids = filteredMessages.map((m) => m.id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    reactionsLoadedRef.current = true;
    chatReactionsApi.getBatch(ids).then((data) => {
      setChatReactions((prev) => {
        const merged = { ...prev };
        for (const [msgId, reactions] of Object.entries(data)) {
          if (!merged[msgId] || merged[msgId].length === 0) {
            merged[msgId] = reactions;
          }
        }
        return merged;
      });
    }).catch(() => {});
  }, [isOpen, filteredMessages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const s = getSocket();
    if (s?.connected) {
      const payload: any = {
        message: trimmed,
        target: activeTab === 'campus' ? 'campus' : 'all',
        campus_scope: activeTab === 'campus' ? effectiveCampus : undefined,
      };
      if (replyingTo) {
        payload.reply_to_id = replyingTo.timestamp;
        payload.reply_to_user = replyingTo.user;
        payload.reply_to_message = replyingTo.message;
      }
      s.emit('chat_message', payload);
      setInput('');
      setReplyingTo(null);
      isNearBottom.current = true;
    } else {
      setSendError('Not connected — message not sent');
      setTimeout(() => setSendError(null), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyingTo) setReplyingTo(null);
  };

  const handleReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const toggleReactionPicker = (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    setReactionPickerFor((prev) => (prev === msgId ? null : msgId));
  };

  const handleTouchStart = (msgId: string | undefined) => {
    if (!msgId) return;
    longPressTimer.current = setTimeout(() => setReactionPickerFor(msgId), LONG_PRESS_MS);
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const handleToggleChatReaction = (messageId: string, emoji: string) => {
    setReactionPickerFor(null);
    if (!messageId) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId);
    const myName = user?.full_name || '';
    let action: 'added' | 'removed' = 'added';
    setChatReactions((prev) => {
      const existing = prev[messageId] || [];
      const found = existing.find((r) => r.emoji === emoji);
      if (found) {
        if (found.user_reacted) {
          action = 'removed';
          const newUsers = found.users.filter((u) => u !== myName);
          if (newUsers.length === 0) return { ...prev, [messageId]: existing.filter((r) => r.emoji !== emoji) };
          return { ...prev, [messageId]: existing.map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, users: newUsers, user_reacted: false } : r) };
        } else {
          action = 'added';
          return { ...prev, [messageId]: existing.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, myName], user_reacted: true } : r) };
        }
      }
      action = 'added';
      return { ...prev, [messageId]: [...existing, { emoji, count: 1, users: [myName], user_reacted: true }] };
    });
    if (!isUuid) return;
    chatReactionsApi.toggle(messageId, emoji).then(() => {
      const s = getSocket();
      if (s) s.emit('chat_reaction_update', { message_id: messageId, emoji, action });
      return chatReactionsApi.get(messageId);
    }).then((data) => {
      if (data) setChatReactions((prev) => ({ ...prev, [messageId]: data }));
    }).catch(() => {});
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const campusColor = (c: string) => c === 'paete' ? 'text-cyan-400' : c === 'pagsanjan' ? 'text-purple-400' : 'text-primary-400';
  const campusBg = (c: string) => c === 'paete' ? 'bg-cyan-500/10 border-cyan-500/20' : c === 'pagsanjan' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-primary-500/10 border-primary-500/20';
  const campusLabel = (c: string) => c === 'paete' ? 'PAETE' : c === 'pagsanjan' ? 'PAGSANJAN' : 'CTRL';
  const avatarColor = (c: string) => c === 'paete' ? 'bg-cyan-500' : c === 'pagsanjan' ? 'bg-purple-500' : 'bg-primary-500';
  const roleLabel = (r: string) => r === 'admin' ? 'Admin' : r === 'principal' ? 'Principal' : r === 'teacher' ? 'Teacher' : 'Staff';

  const renderQuotedReply = (msg: ChatMessage, isMe: boolean) => {
    if (!msg.reply_to_user) return null;
    return (
      <div className={`mb-1.5 px-2 py-1 rounded-lg border-l-2 ${isMe ? 'bg-primary-700/30 border-primary-300/50' : 'bg-gray-700/40 border-gray-500/50'}`}>
        <div className="flex items-center gap-1 mb-0.5">
          <CornerUpLeft size={9} className={isMe ? 'text-primary-300' : 'text-gray-400'} />
          <span className={`text-[9px] font-semibold ${isMe ? 'text-primary-300' : 'text-gray-400'}`}>{msg.reply_to_user}</span>
        </div>
        <p className={`text-[10px] leading-snug truncate ${isMe ? 'text-primary-200/70' : 'text-gray-500'}`}>{msg.reply_to_message}</p>
      </div>
    );
  };

  const renderReactionPicker = (msgId: string, isMe: boolean) => {
    if (reactionPickerFor !== msgId) return null;
    return (
      <div className={`flex gap-0.5 bg-gray-800 border border-gray-600/60 rounded-lg p-1 shadow-xl mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
        {CHAT_REACTION_EMOJIS.map((emoji) => (
          <button key={emoji} onClick={(e) => { e.stopPropagation(); handleToggleChatReaction(msgId, emoji); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors text-sm">
            {emoji}
          </button>
        ))}
      </div>
    );
  };

  const renderReactions = (msg: ChatMessage, isMe: boolean) => {
    const key = msg.id || msg.timestamp;
    const msgReactions = chatReactions[key] || [];
    if (msgReactions.length === 0) return null;
    return (
      <div className={`flex flex-wrap gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
        {msgReactions.map((r) => (
          <button key={r.emoji} onClick={() => handleToggleChatReaction(key, r.emoji)}
            className={`group/tip relative flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${r.user_reacted ? 'bg-primary-500/20 border-primary-500/40 text-primary-300' : 'bg-gray-700/50 border-gray-600/50 text-gray-400 hover:bg-gray-700'}`}>
            <span>{r.emoji}</span>
            <span className="font-medium">{r.count}</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-800 border border-gray-600/60 rounded-lg shadow-xl opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-150 pointer-events-none whitespace-nowrap z-[70]">
              <p className="text-[10px] text-gray-300 font-medium">{formatReactionTooltip(r, user?.full_name || '')}</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
            </div>
          </button>
        ))}
      </div>
    );
  };

  const ReplyButton = ({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) => (
    <button
      onClick={(e) => { e.stopPropagation(); handleReply(msg); }}
      className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 border border-gray-600/50 hover:bg-primary-600 hover:border-primary-500 shadow-md transition-colors z-10 ${isMe ? '-left-8' : '-right-8'}`}
      title="Reply"
    >
      <Reply size={11} className="text-gray-400" />
    </button>
  );

  const renderBubble = (msg: ChatMessage, isMe: boolean, isCampusMsg: boolean, isLastInGroup: boolean) => (
    <div className="relative">
      <div className={`px-3 py-1.5 text-xs leading-relaxed ${isMe
        ? `bg-primary-600 text-white ${isLastInGroup ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl'}`
        : isCampusMsg
          ? `bg-yellow-500/10 border border-yellow-500/20 text-gray-200 ${isLastInGroup ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl'}`
          : `bg-gray-800 border border-gray-700/60 text-gray-300 ${isLastInGroup ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl'}`
      }`}>
        {renderQuotedReply(msg, isMe)}
        {msg.message}
      </div>
      <ReplyButton msg={msg} isMe={isMe} />
    </div>
  );

  const MetaRow = ({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) => (
    <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      <span className="text-[9px] text-gray-600">{formatTime(msg.timestamp)}</span>
      <span className={`text-[9px] px-1 py-0.5 rounded ${campusBg(msg.campus)} ${campusColor(msg.campus)}`}>{campusLabel(msg.campus)}</span>
      <span className={`text-[9px] px-1 py-0.5 rounded ${campusBg(msg.campus)} ${campusColor(msg.campus)} font-medium`}>{roleLabel(msg.role)}</span>
      <button onClick={(e) => { e.stopPropagation(); toggleReactionPicker(e, msg.id || msg.timestamp); }}
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700/60 transition-colors" title="React">
        <SmilePlus size={12} className="text-gray-500" />
      </button>
    </div>
  );

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />}

      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-gray-900 border-l border-gray-700/60 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/60 bg-gray-900/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
              <MessageSquare size={15} className="text-primary-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">In-Call Chat</h2>
              <p className="text-[10px] text-gray-500">{filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-700/60 text-gray-400 hover:text-gray-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700/60 bg-gray-900/50 flex-shrink-0">
          <button onClick={() => setActiveTab('all')} className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${activeTab === 'all' ? 'text-white border-b-2 border-primary-500 bg-gray-800/40' : 'text-gray-500 hover:text-gray-300'}`}>
            <Users size={13} />All
            {activeTab !== 'all' && unreadAll > 0 && (
              <span className="absolute top-1.5 right-4 min-w-[14px] h-3.5 bg-blue-500 rounded-full text-[9px] font-bold flex items-center justify-center px-1 animate-badge-pulse">{unreadAll > 9 ? '9+' : unreadAll}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('campus')} className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${activeTab === 'campus' ? 'text-white border-b-2 border-primary-500 bg-gray-800/40' : 'text-gray-500 hover:text-gray-300'}`}>
            <School size={13} />{effectiveCampus === 'paete' ? 'Paete' : 'Pagsanjan'}
            {activeTab !== 'campus' && unreadCampus > 0 && (
              <span className="absolute top-1.5 right-4 min-w-[14px] h-3.5 bg-blue-500 rounded-full text-[9px] font-bold flex items-center justify-center px-1 animate-badge-pulse">{unreadCampus > 9 ? '9+' : unreadCampus}</span>
            )}
          </button>
        </div>

        {/* Campus Selector */}
        {isAdmin && activeTab === 'campus' && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/60 bg-gray-800/30 flex-shrink-0">
            <span className="text-[10px] text-gray-500">Send to:</span>
            {(['paete', 'pagsanjan'] as const).map((c) => (
              <button key={c} onClick={() => setCampusTarget(c)} className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${campusTarget === c ? `${c === 'paete' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'}` : 'bg-gray-700/60 text-gray-400 hover:bg-gray-600 border border-transparent'}`}>
                {c === 'paete' ? 'Paete' : 'Pagsanjan'}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-3 space-y-0.5">
          {filteredMessages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-gray-800/80 flex items-center justify-center mx-auto mb-3"><MessageCircle size={20} className="text-gray-600" /></div>
              <p className="text-gray-500 text-xs font-medium mb-1">{activeTab === 'all' ? 'No messages yet' : `No ${effectiveCampus === 'paete' ? 'Paete' : 'Pagsanjan'} messages yet`}</p>
              <p className="text-gray-600 text-[10px]">{activeTab === 'all' ? 'Messages sent to All will appear here' : `Only ${effectiveCampus === 'paete' ? 'Paete' : 'Pagsanjan'} campus messages appear here`}</p>
            </div>
          )}
          {filteredMessages.map((msg, i) => {
            const isMe = msg.user === user?.full_name;
            const isCampusMsg = msg.target === 'campus';
            const prev = filteredMessages[i - 1];
            const next = filteredMessages[i + 1];
            const showHeader = !prev || !isSameSender(prev, msg);
            const isLastInGroup = !next || !isSameSender(msg, next);
            const showDateSeparator = !prev || !isSameDay(prev.timestamp, msg.timestamp);

            return (
              <div key={i} className="animate-slide-up" onTouchStart={() => handleTouchStart(msg.id)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                {showDateSeparator && (
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-gray-700/50" />
                    <span className="text-[10px] text-gray-600 font-medium whitespace-nowrap">{formatDateSeparator(msg.timestamp)}</span>
                    <div className="flex-1 h-px bg-gray-700/50" />
                  </div>
                )}
                {showHeader ? (
                  <div className={`flex gap-2 mt-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-7 h-7 rounded-full ${avatarColor(msg.campus)} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>{msg.user?.charAt(0)}</div>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      <span className="text-[10px] font-semibold text-gray-300 mb-0.5">{msg.user}</span>
                      {renderBubble(msg, isMe, isCampusMsg, isLastInGroup)}
                      <MetaRow msg={msg} isMe={isMe} />
                      {renderReactions(msg, isMe)}
                      {renderReactionPicker(msg.id || msg.timestamp, isMe)}
                    </div>
                  </div>
                ) : (
                  <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-7 flex-shrink-0" />
                    <div className="max-w-[75%]">{renderBubble(msg, isMe, isCampusMsg, isLastInGroup)}</div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-4 py-2 border-t border-gray-700/60 bg-gray-800/60 flex-shrink-0 animate-slide-up">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CornerUpLeft size={12} className="text-primary-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-primary-400">Replying to {replyingTo.user}</p>
                  <p className="text-[10px] text-gray-500 truncate">{replyingTo.message}</p>
                </div>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 flex-shrink-0"><X size={12} /></button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-gray-700/60 bg-gray-900/80 backdrop-blur-sm flex-shrink-0">
          {sendError && (
            <div className="mb-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
              <AlertTriangle size={10} />
              {sendError}
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${activeTab === 'campus' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' : 'bg-gray-700/60 border border-gray-600/40 text-gray-400'}`}>
              {activeTab === 'campus' ? `To ${effectiveCampus === 'paete' ? 'Paete' : 'Pagsanjan'}` : 'To Everyone'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={replyingTo ? `Reply to ${replyingTo.user}...` : activeTab === 'campus' ? `Message ${effectiveCampus === 'paete' ? 'Paete' : 'Pagsanjan'}...` : 'Message everyone...'}
              className="flex-1 bg-gray-800/80 border border-gray-700/60 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all" />
            <button onClick={handleSend} disabled={!input.trim()}
              className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700/60 disabled:text-gray-500 text-white transition-all duration-200 disabled:scale-95">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
