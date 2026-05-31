import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '../api/client';
import './Notifications.css';

const TYPE_CONFIG = {
  success: { icon: CheckCircle, colorClass: 'notif-success' },
  warning: { icon: AlertTriangle, colorClass: 'notif-warning' },
  info:    { icon: Info,         colorClass: 'notif-info'    },
};

const getIcon = (type) => {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  return cfg.icon;
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const formatTime = (createdAt) => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString('en-IN');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            System alerts, project updates, and subsidy status changes.
            {unreadCount > 0 && <span className="notif-badge">{unreadCount} unread</span>}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline" onClick={markAllRead}>
            <CheckCheck size={16} /> Mark All Read
          </button>
        )}
      </div>

      <div className="notif-tabs">
        {['all', 'unread', 'read'].map(f => (
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
        ) : filtered.map((notif, i) => {
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
