import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ShieldAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { API_BASE, getToken } from '../../api/client';
import { governanceApi, type NotificationItem } from '../../api/governance';

const realtimeEvents = [
  'Connected',
  'GroupJoined',
  'NewApprovalRequest',
  'ApprovalDecided',
  'ApprovalRevoked',
  'EmergencyAlert',
  'PolicyUpdated',
  'FalsePositiveSubmitted',
  'FalsePositiveReviewed',
  'IncidentCreated',
  'IncidentUpdated'
];

function notificationHubUrl(): string {
  if (API_BASE.startsWith('http://') || API_BASE.startsWith('https://')) {
    return `${API_BASE.replace(/\/api$/, '')}/hubs/notifications`;
  }
  return `${window.location.origin}/hubs/notifications`;
}

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [realtimeAlert, setRealtimeAlert] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setItems(await governanceApi.notifications(false));
    } catch {
      // Keep the topbar usable while the API is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    let disposed = false;
    let started = false;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(notificationHubUrl(), { accessTokenFactory: () => getToken() || '' })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    const receive = (eventName: string, payload: unknown) => {
      const record = payload && typeof payload === 'object'
        ? payload as Record<string, unknown>
        : {};
      const subject = String(record.title || record.status || record.riskLevel || '');
      setRealtimeAlert(`${eventName}${subject ? `: ${subject}` : ''}`);
      void load();
    };

    realtimeEvents.forEach(eventName => {
      connection.on(eventName, payload => receive(eventName, payload));
    });
    void connection.start()
      .then(() => {
        started = true;
        if (disposed) void connection.stop();
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      realtimeEvents.forEach(eventName => connection.off(eventName));
      if (started) void connection.stop();
    };
  }, [load]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = items.filter(item => !item.isRead).length + (realtimeAlert ? 1 : 0);

  const openItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      await governanceApi.markNotificationRead(item.id).catch(() => undefined);
      setItems(current => current.map(entry => entry.id === item.id
        ? { ...entry, isRead: true, readAt: new Date().toISOString() }
        : entry));
    }
    setOpen(false);
    if (item.actionUrl) navigate(item.actionUrl);
  };

  return (
    <div className="notification-center" ref={containerRef}>
      <button
        className="notification-bell"
        title="Thông báo"
        aria-label={`Thông báo chưa đọc: ${unread}`}
        onClick={() => setOpen(value => !value)}
      >
        <Bell size={18} />
        {unread > 0 && <span className="notification-badge">{Math.min(unread, 99)}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div>
              <strong>Trung tâm thông báo</strong>
              <span>{unread} mục chưa đọc</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Đóng"><X size={17} /></button>
          </div>

          {realtimeAlert && (
            <div className="notification-realtime">
              <ShieldAlert size={17} />
              <div><strong>Cảnh báo realtime</strong><span>{realtimeAlert}</span></div>
              <button onClick={() => setRealtimeAlert('')} aria-label="Đã xem"><CheckCheck size={16} /></button>
            </div>
          )}

          <div className="notification-list">
            {items.length === 0 && !realtimeAlert && (
              <div className="notification-empty">Chưa có thông báo.</div>
            )}
            {items.map(item => (
              <button
                key={item.id}
                className={`notification-item ${item.isRead ? '' : 'unread'}`}
                onClick={() => void openItem(item)}
              >
                <span className="notification-dot" />
                <span className="notification-copy">
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                  <time>{new Date(item.createdAt).toLocaleString('vi-VN')}</time>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
