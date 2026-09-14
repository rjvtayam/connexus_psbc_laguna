import { useState, useEffect, useRef } from 'react';
import { Announcement } from '../../types/announcement';
import { announcementsApi } from '../../api/announcements.api';
import { notificationsApi, Notification } from '../../api/notifications.api';
import { reactionsApi, ReactionSummary } from '../../api/reactions.api';
import { bulletinCommentsApi, BulletinComment } from '../../api/bulletinComments.api';
import { useAuthStore } from '../../stores/authStore';
import { useSessionStore } from '../../stores/sessionStore';
import { getSocket } from '../../hooks/useSocket';
import { pushSettingsToast } from '../ui/SettingsToast';
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Info,
  Megaphone,
  Plus,
  Send,
  ChevronDown,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  SmilePlus,
  Edit3,
  Save,
} from 'lucide-react';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export function BulletinBoard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'bulletins'>('notifications');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const { user } = useAuthStore();
  const unreadNotificationCount = useSessionStore((s) => s.unreadNotificationCount);
  const lastViewedBulletinsAt = useSessionStore((s) => s.lastViewedBulletinsAt);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [reactionsMap, setReactionsMap] = useState<Record<string, ReactionSummary[]>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, BulletinComment[]>>({});
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [formType, setFormType] = useState<'bulletin' | 'info' | 'emergency'>('bulletin');
  const [formTarget, setFormTarget] = useState<'both' | 'paete' | 'pagsanjan'>('both');
  const formRef = useRef<HTMLFormElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const canCreate = user?.role === 'admin' || user?.role === 'principal';

  const unreadBulletinCount = announcements.filter(
    (a) => new Date(a.created_at).getTime() > lastViewedBulletinsAt
  ).length;

  const totalUnread = unreadNotificationCount + unreadBulletinCount;

  useEffect(() => {
    loadAnnouncements();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      loadAnnouncements();
      if (unreadBulletinCount > 0) {
        setActiveTab('bulletins');
        useSessionStore.getState().markBulletinsViewed();
      } else {
        setActiveTab('notifications');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (announcements.length > 0) {
      announcements.forEach((ann) => loadReactions(ann.id));
    }
  }, [announcements]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const handleBulletin = (data: any) => {
      const newAnn: Announcement = {
        id: Date.now().toString(),
        title: data.title,
        content: data.content,
        link: data.link || null,
        image_url: data.image_url || null,
        type: data.type,
        target_campus: data.target_campus || 'both',
        created_by: data.created_by,
        is_active: true,
        display_until: null,
        created_at: data.timestamp || new Date().toISOString(),
      };
      setAnnouncements((prev) => [newAnn, ...prev]);
      loadNotifications();
    };

    const handleReaction = (data: { announcement_id: string; emoji: string; action: string; user: string }) => {
      setReactionsMap((prev) => {
        const existing = prev[data.announcement_id] || [];
        const updated = existing.map((r) => {
          if (r.emoji === data.emoji) {
            if (data.action === 'added') {
              return { ...r, count: r.count + 1, users: [...r.users, data.user], user_reacted: r.user_reacted || data.user === user?.full_name };
            } else {
              const newUsers = r.users.filter((u) => u !== data.user);
              return { ...r, count: Math.max(0, r.count - 1), users: newUsers, user_reacted: data.user !== user?.full_name ? r.user_reacted : false };
            }
          }
          return r;
        });

        const exists = updated.find((r) => r.emoji === data.emoji);
        if (!exists && data.action === 'added') {
          updated.push({ emoji: data.emoji, count: 1, users: [data.user], user_reacted: data.user === user?.full_name });
        }

        return { ...prev, [data.announcement_id]: updated.filter((r) => r.count > 0) };
      });
    };

    s.on('bulletin_new', handleBulletin);
    s.on('reaction_update', handleReaction);
    return () => {
      s.off('bulletin_new', handleBulletin);
      s.off('reaction_update', handleReaction);
    };
  }, [user?.full_name]);

  const loadAnnouncements = async () => {
    try {
      const data = await announcementsApi.getActive(user?.campus);
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch (error) {
      // silent
    }
  };

  const loadReactions = async (announcementId: string) => {
    try {
      const data = await reactionsApi.get(announcementId);
      setReactionsMap((prev) => ({ ...prev, [announcementId]: data }));
    } catch (error) {
      // silent
    }
  };

  const loadComments = async (announcementId: string) => {
    try {
      const data = await bulletinCommentsApi.get(announcementId);
      setCommentsMap((prev) => ({ ...prev, [announcementId]: data }));
    } catch (error) {
      // silent
    }
  };

  const handleAddComment = async (announcementId: string) => {
    if (!commentInput.trim()) return;
    setCommentLoading(true);
    try {
      const newComment = await bulletinCommentsApi.add(announcementId, commentInput.trim());
      setCommentsMap((prev) => ({
        ...prev,
        [announcementId]: [...(prev[announcementId] || []), newComment],
      }));
      setCommentInput('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (announcementId: string, commentId: string) => {
    try {
      await bulletinCommentsApi.delete(announcementId, commentId);
      setCommentsMap((prev) => ({
        ...prev,
        [announcementId]: (prev[announcementId] || []).filter((c) => c.id !== commentId),
      }));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const startEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setEditTitle(ann.title);
    setEditContent(ann.content || '');
    setEditLink(ann.link || '');
    setEditImagePreview(ann.image_url || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditLink('');
    setEditImagePreview(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    setEditSaving(true);
    try {
      const updated = await announcementsApi.update(editingId, {
        title: editTitle.trim(),
        content: editContent.trim() || undefined,
        link: editLink.trim() || undefined,
        image_url: editImagePreview || undefined,
      });
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, ...updated } : a))
      );
      cancelEdit();
    } catch (error) {
      console.error('Failed to update bulletin:', error);
    } finally {
      setEditSaving(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    try {
      await announcementsApi.delete(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete bulletin:', error);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      if (unreadNotificationCount > 0) {
        useSessionStore.getState().setNotificationCount(Math.max(0, unreadNotificationCount - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      useSessionStore.getState().clearAllNotifications();
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  const handleDeleteNotif = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleToggleReaction = async (announcementId: string, emoji: string) => {
    setShowReactionPicker(null);
    try {
      const result = await reactionsApi.toggle(announcementId, emoji);
      const s = getSocket();
      if (s) {
        s.emit('reaction_update', { announcement_id: announcementId, emoji, action: result.action });
      }
      loadReactions(announcementId);
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const toggleComments = (announcementId: string) => {
    if (showCommentsFor === announcementId) {
      setShowCommentsFor(null);
      setCommentInput('');
    } else {
      setShowCommentsFor(announcementId);
      setCommentInput('');
      if (!commentsMap[announcementId]) loadComments(announcementId);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      pushSettingsToast('Image too large (max 5MB)', false);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleCreateBulletin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setCreating(true);
    try {
      const payload: any = {
        title: formTitle.trim(),
        content: formContent.trim() || undefined,
        link: formLink.trim() || undefined,
        image_url: formImagePreview || undefined,
        type: formType,
        target_campus: formTarget,
      };
      await announcementsApi.create(payload);
      const s = getSocket();
      if (s) {
        s.emit('bulletin_update', payload);
      }
      setFormTitle('');
      setFormContent('');
      setFormLink('');
      setFormImagePreview(null);
      setFormType('bulletin');
      setFormTarget('both');
      setShowCreateForm(false);
      loadAnnouncements();
    } catch (error) {
      console.error('Failed to create bulletin:', error);
    } finally {
      setCreating(false);
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle size={14} className="text-red-400" />;
      case 'bulletin':
        return <Megaphone size={14} className="text-blue-400" />;
      default:
        return <Info size={14} className="text-gray-400" />;
    }
  };

  const typeBg = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'bg-red-500/10 border-red-500/20 border-l-2 border-l-red-500';
      case 'bulletin':
        return 'bg-blue-500/10 border-blue-500/20 border-l-2 border-l-blue-500';
      default:
        return 'bg-gray-700/50 border-gray-600 border-l-2 border-l-gray-500';
    }
  };

  const announcementColors: Record<string, string> = {
    bulletin: 'border-l-blue-500',
    emergency: 'border-l-red-500',
    info: 'border-l-green-500',
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
      >
        <Bell size={20} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center px-1 animate-badge-pulse">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-gray-900 border-l border-gray-700/60 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out translate-x-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/60 bg-gray-900/80 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Bell size={15} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white leading-tight">Notifications</h2>
                  <p className="text-[10px] text-gray-500">
                    {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {totalUnread > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-lg hover:bg-gray-700/60 text-gray-400 hover:text-green-400 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-700/60 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700/60 bg-gray-900/50 flex-shrink-0">
              <button
                onClick={() => setActiveTab('notifications')}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === 'notifications'
                    ? 'text-white border-b-2 border-primary-500 bg-gray-800/40'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Bell size={13} />
                Notifications
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1.5 right-4 min-w-[14px] h-3.5 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center px-1 animate-badge-pulse">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('bulletins');
                  if (unreadBulletinCount > 0) {
                    useSessionStore.getState().markBulletinsViewed();
                  }
                }}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === 'bulletins'
                    ? 'text-white border-b-2 border-primary-500 bg-gray-800/40'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Megaphone size={13} />
                Bulletins
                {unreadBulletinCount > 0 && (
                  <span className="absolute top-1.5 right-4 min-w-[14px] h-3.5 bg-blue-500 rounded-full text-[9px] font-bold flex items-center justify-center px-1 animate-badge-pulse">
                    {unreadBulletinCount > 9 ? '9+' : unreadBulletinCount}
                  </span>
                )}
              </button>
            </div>

            {/* Create Form (admin/principal only) */}
            {showCreateForm && canCreate && (
              <form ref={formRef} onSubmit={handleCreateBulletin} className="p-4 border-b border-gray-700/60 space-y-3 bg-gray-800/50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white">New Bulletin</h3>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="p-1 rounded-lg hover:bg-gray-700/60 text-gray-400">
                    <X size={12} />
                  </button>
                </div>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Title"
                  required
                  maxLength={200}
                  className="w-full bg-gray-700/60 border border-gray-600/60 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Content (optional)"
                  maxLength={2000}
                  rows={3}
                  className="w-full bg-gray-700/60 border border-gray-600/60 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                />
                <div className="relative">
                  <LinkIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="url"
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    placeholder="https://example.com (optional)"
                    className="w-full bg-gray-700/60 border border-gray-600/60 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  {formImagePreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-gray-600/60">
                      <img src={formImagePreview} alt="Preview" className="w-full h-32 object-cover" />
                      <button type="button" onClick={removeImage} className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-red-500/80 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:border-primary-500 hover:text-primary-400 transition-colors text-[11px]"
                    >
                      <ImageIcon size={13} />
                      Add image (optional)
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <select value={formType} onChange={(e) => setFormType(e.target.value as any)} className="w-full appearance-none bg-gray-700/60 border border-gray-600/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500 pr-7">
                      <option value="bulletin">Bulletin</option>
                      <option value="info">Info</option>
                      <option value="emergency">Emergency</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select value={formTarget} onChange={(e) => setFormTarget(e.target.value as any)} className="w-full appearance-none bg-gray-700/60 border border-gray-600/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500 pr-7">
                      <option value="both">Both Campuses</option>
                      <option value="paete">Paete</option>
                      <option value="pagsanjan">Pagsanjan</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreateForm(false)} className="px-3 py-1.5 text-[11px] rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating || !formTitle.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50">
                    <Send size={11} />
                    {creating ? 'Sending...' : 'Publish'}
                  </button>
                </div>
              </form>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'notifications' ? (
                notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                      <Bell size={20} className="text-gray-600" />
                    </div>
                    <p className="text-gray-500 text-xs font-medium">No notifications yet</p>
                    <p className="text-gray-600 text-[10px] mt-1">Bulletins and alerts will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`relative p-3 rounded-lg border transition-all ${
                          notif.is_read
                            ? 'bg-gray-800/30 border-gray-700/50 opacity-60'
                            : `${typeBg(notif.type)}`
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">{typeIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className={`text-xs font-semibold ${notif.is_read ? 'text-gray-400' : 'text-white'}`}>
                                {notif.title}
                              </h3>
                              {!notif.is_read && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0 animate-badge-pulse" />
                              )}
                            </div>
                            {notif.message && (
                              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                            )}
                            <p className="text-[10px] text-gray-600 mt-1">
                              {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {!notif.is_read && (
                              <button
                                onClick={() => handleMarkRead(notif.id)}
                                className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-green-400 transition-colors"
                                title="Mark as read"
                              >
                                <CheckCheck size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotif(notif.id)}
                              className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div>
                  {canCreate && !showCreateForm && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:border-primary-500 hover:text-primary-400 transition-colors text-xs"
                    >
                      <Plus size={14} />
                      New Bulletin
                    </button>
                  )}

                  {announcements.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                        <Megaphone size={20} className="text-gray-600" />
                      </div>
                      <p className="text-gray-500 text-xs font-medium">No bulletins</p>
                      <p className="text-gray-600 text-[10px] mt-1">Announcements from admins will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {announcements.map((ann) => {
                        const annReactions = reactionsMap[ann.id] || [];
                        return (
                          <div
                            key={ann.id}
                            className={`bg-gray-800 rounded-lg overflow-hidden border-l-4 ${announcementColors[ann.type] || 'border-l-gray-500'} hover:bg-gray-800/80 transition-colors group`}
                          >
                            {editingId === ann.id ? (
                              <div className="p-3 space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Editing</span>
                                  <button onClick={cancelEdit} className="p-1 rounded text-gray-500 hover:text-gray-300">
                                    <X size={12} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full bg-gray-700/60 border border-gray-600/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  placeholder="Title"
                                />
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full bg-gray-700/60 border border-gray-600/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                                  placeholder="Content"
                                  rows={3}
                                />
                                <div className="relative">
                                  <LinkIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                  <input
                                    type="url"
                                    value={editLink}
                                    onChange={(e) => setEditLink(e.target.value)}
                                    className="w-full bg-gray-700/60 border border-gray-600/60 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="https://example.com (optional)"
                                  />
                                </div>
                                <div>
                                  <input ref={editImageInputRef} type="file" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = () => setEditImagePreview(reader.result as string);
                                    reader.readAsDataURL(file);
                                  }} className="hidden" />
                                  {editImagePreview ? (
                                    <div className="relative rounded-lg overflow-hidden border border-gray-600/60">
                                      <img src={editImagePreview} alt="Preview" className="w-full h-24 object-cover" />
                                      <button type="button" onClick={() => setEditImagePreview(null)} className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-red-500/80">
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => editImageInputRef.current?.click()} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:border-primary-500 hover:text-primary-400 text-[10px]">
                                      <ImageIcon size={11} /> Add image
                                    </button>
                                  )}
                                </div>
                                <div className="flex justify-end gap-1.5">
                                  <button onClick={cancelEdit} className="px-2.5 py-1 text-[10px] rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600">Cancel</button>
                                  <button onClick={handleSaveEdit} disabled={editSaving || !editTitle.trim()} className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50">
                                    <Save size={10} />{editSaving ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                            {ann.image_url && (
                              <div className="relative">
                                <img src={ann.image_url} alt={ann.title} className="w-full h-36 object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      ann.type === 'emergency' ? 'bg-red-500/30 text-red-300' : ann.type === 'bulletin' ? 'bg-blue-500/30 text-blue-300' : 'bg-green-500/30 text-green-300'
                                    }`}>{ann.type}</span>
                                  </div>
                                  <h3 className="font-bold text-white text-sm drop-shadow-lg">{ann.title}</h3>
                                </div>
                              </div>
                            )}
                            <div className="p-3">
                              {!ann.image_url && (
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                    ann.type === 'emergency' ? 'bg-red-500/30 text-red-300' : ann.type === 'bulletin' ? 'bg-blue-500/30 text-blue-300' : 'bg-green-500/30 text-green-300'
                                  }`}>{ann.type}</span>
                                  <span className="text-[10px] text-gray-600">{new Date(ann.created_at).toLocaleDateString()}</span>
                                </div>
                              )}

                              {!ann.image_url && (
                                <h3 className="font-bold text-white text-sm mb-1">{ann.title}</h3>
                              )}

                              {ann.content && (
                                <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-3 mt-1">{ann.content}</p>
                              )}

                              {ann.link && (
                                <a
                                  href={ann.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-primary-500/10 border border-primary-500/20 text-[10px] text-primary-400 hover:text-primary-300 hover:bg-primary-500/20 transition-colors"
                                >
                                  <ExternalLink size={10} />
                                  {ann.link.length > 30 ? ann.link.slice(0, 30) + '...' : ann.link}
                                </a>
                              )}

                              {/* Creator Highlight */}
                              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-700/40">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500/40 to-cyan-500/40 border border-gray-600/50 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[9px] font-bold text-white">
                                    {(ann.creator_name || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-[11px] font-semibold text-gray-300">{ann.creator_name || 'Unknown'}</span>
                                  <span className="text-[9px] text-gray-600 ml-1.5">{new Date(ann.created_at).toLocaleDateString()}</span>
                                </div>
                                {(user?.id === ann.created_by || user?.role === 'admin') && (
                                  <div className="flex items-center gap-0.5 opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEdit(ann)}
                                      className="p-1 rounded text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit3 size={11} />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmId(ann.id)}
                                      className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Reactions + Comments Row */}
                              <div className="flex items-center gap-1 mt-2">
                                {annReactions.map((r) => (
                                  <button
                                    key={r.emoji}
                                    onClick={() => handleToggleReaction(ann.id, r.emoji)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${
                                      r.user_reacted
                                        ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                                        : 'bg-gray-700/40 border-gray-600/40 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                                    }`}
                                    title={r.users.join(', ')}
                                  >
                                    <span className="leading-none">{r.emoji}</span>
                                    <span className="font-medium">{r.count}</span>
                                  </button>
                                ))}
                                <div className="relative">
                                  <button
                                    onClick={() => setShowReactionPicker(showReactionPicker === ann.id ? null : ann.id)}
                                    className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-700/40 border border-gray-600/40 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                                  >
                                    <SmilePlus size={10} />
                                  </button>
                                  {showReactionPicker === ann.id && (
                                    <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 bg-gray-800 border border-gray-600/60 rounded-lg p-1 shadow-xl z-10">
                                      {REACTION_EMOJIS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleToggleReaction(ann.id, emoji)}
                                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700 transition-colors text-sm"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="w-px h-4 bg-gray-700/50 mx-0.5" />
                                <button
                                  onClick={() => toggleComments(ann.id)}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${
                                    showCommentsFor === ann.id
                                      ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                                      : 'bg-gray-700/40 border-gray-600/40 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                                  }`}
                                >
                                  <MessageSquare size={10} />
                                  {(commentsMap[ann.id] || []).length > 0 && (
                                    <span className="font-medium">{(commentsMap[ann.id] || []).length}</span>
                                  )}
                                </button>
                              </div>

                              {/* Comments Section */}
                              {showCommentsFor === ann.id && (
                                <div className="mt-2.5 pt-2.5 border-t border-gray-700/40 space-y-2">
                                  {(commentsMap[ann.id] || []).length === 0 && (
                                    <p className="text-[10px] text-gray-600 text-center py-1.5">No comments yet</p>
                                  )}
                                  {(commentsMap[ann.id] || []).map((comment) => (
                                    <div key={comment.id} className="flex items-start gap-1.5 group/comment">
                                      <div className="w-4 h-4 rounded-full bg-gray-700/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-[7px] font-bold text-gray-400">{comment.user_name?.charAt(0)?.toUpperCase()}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-semibold text-gray-300">{comment.user_name}</span>
                                          <span className="text-[8px] text-gray-600">{new Date(comment.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 break-words leading-relaxed">{comment.message}</p>
                                      </div>
                                      {(comment.user_id === user?.id || user?.role === 'admin') && (
                                        <button
                                          onClick={() => handleDeleteComment(ann.id, comment.id)}
                                          className="p-0.5 rounded opacity-0 group-hover/comment:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                                          title="Delete"
                                        >
                                          <Trash2 size={9} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary-500/40 to-cyan-500/40 flex items-center justify-center flex-shrink-0">
                                      <span className="text-[7px] font-bold text-white">{user?.full_name?.charAt(0)?.toUpperCase()}</span>
                                    </div>
                                    <input
                                      type="text"
                                      value={showCommentsFor === ann.id ? commentInput : ''}
                                      onChange={(e) => setCommentInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleAddComment(ann.id);
                                        }
                                      }}
                                      placeholder="Write a comment..."
                                      className="flex-1 bg-gray-700/30 border border-gray-600/40 rounded-lg px-2 py-1 text-[10px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    />
                                    <button
                                      onClick={() => handleAddComment(ann.id)}
                                      disabled={commentLoading || !commentInput.trim()}
                                      className="p-1 rounded-md bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors disabled:opacity-40"
                                    >
                                      <Send size={10} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                            </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setDeleteConfirmId(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl z-[61] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Bulletin</h3>
                <p className="text-[11px] text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">This bulletin will be permanently removed from the board.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-[11px] rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSoftDelete(deleteConfirmId)}
                className="px-3 py-1.5 text-[11px] rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
