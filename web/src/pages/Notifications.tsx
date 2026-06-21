import { useState, type ComponentType } from 'react';
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle, Clock, type LucideProps } from 'lucide-react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useNotifications';
import { useTranslation } from '../i18n/useTranslation';
import { logger } from '../lib/logger';
import './Notifications.css';

interface TypeConfigEntry {
  icon: ComponentType<LucideProps>;
  colorClass: string;
}
const TYPE_CONFIG: Record<string, TypeConfigEntry> = {
  success: { icon: CheckCircle, colorClass: 'notif-success' },
  warning: { icon: AlertTriangle, colorClass: 'notif-warning' },
  info:    { icon: Info,         colorClass: 'notif-info'    },
};

type FilterType = 'all' | 'unread' | 'read';

const Notifications = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: notifications = [], isLoading: loading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const markAllRead = async (): Promise<void> => {
    try { await markAll.mutateAsync(); }
    catch (err) { logger.warn('Notifications.markAllRead', err); }
  };

  const handleMarkRead = async (id: number | string): Promise<void> => {
    try { await markRead.mutateAsync(id); }
    catch (err) { logger.warn('Notifications.markRead', err); }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const formatTime = (createdAt: string | null | undefined): string => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString('en-IN');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('notifications.title')}</h1>
          <p className="page-subtitle">
            {t('notifications.subtitle')}
            {unreadCount > 0 && <span className="notif-badge">{t('notifications.unreadCount', { count: unreadCount })}</span>}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline" onClick={markAllRead}>
            <CheckCheck size={16} /> {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      <div className="notif-tabs">
        {(['all', 'unread', 'read'] as FilterType[]).map(f => (
          <button
            key={f}
            className={`notif-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="notif-list">
        {loading ? (
          <div className="glass-card empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
            <p>Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
            <Bell size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No notifications here.</p>
          </div>
        ) : filtered.map((notif: any, i: number) => {
          const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
          const Icon = cfg.icon;
          return (
            <div
              key={notif.id}
              className={`glass-card notif-item animate-fade-in ${!notif.is_read ? 'notif-unread' : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => !notif.is_read && handleMarkRead(notif.id)}
            >
              <div className={`notif-icon-wrap ${cfg.colorClass}`}>
                <Icon size={20} />
              </div>
              <div className="notif-content">
                <div className="notif-header-row">
                  <p className="notif-title">{notif.title}</p>
                  {!notif.is_read && <span className="notif-dot" />}
                </div>
                <p className="notif-message">{notif.message}</p>
                <div className="notif-time">
                  <Clock size={12} />
                  <span>{formatTime(notif.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
