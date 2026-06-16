import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { getToken } from '../api/client';

export interface ExtensionDlpEvent {
  deviceId: string;
  hostname: string;
  userEmail: string;
  websiteAi: string;
  eventType: string;
  riskScore: number;
  riskLevel: string;
  dataTypeMatched: string;
  decision: string;
  createdAt: string;
}

export interface ExtensionOnlineStatus {
  deviceId: string;
  hostname: string;
  userEmail: string;
  connected: boolean;
  lastSeen?: string;
}

export interface RealtimeContextValue {
  extensionEvents: ExtensionDlpEvent[];
  extensionStatus: Map<string, ExtensionOnlineStatus>;
  clearEvents: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  extensionEvents: [],
  extensionStatus: new Map(),
  clearEvents: () => {},
});

export function useRealtimeExtension() {
  return useContext(RealtimeContext);
}

const EXTENSION_EVENTS = ['ExtensionDlpEvent', 'ExtensionOnline', 'ExtensionOffline', 'ExtensionHeartbeat'];

function notificationHubUrl(): string {
  const origin = window.location.origin;
  return `${origin}/hubs/notifications`;
}

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [extensionEvents, setExtensionEvents] = useState<ExtensionDlpEvent[]>([]);
  const [extensionStatus, setExtensionStatus] = useState<Map<string, ExtensionOnlineStatus>>(new Map());

  const clearEvents = useCallback(() => {
    setExtensionEvents([]);
  }, []);

  useEffect(() => {
    let disposed = false;
    let started = false;
    let connection: signalR.HubConnection | null = null;

    const token = getToken();
    if (!token) return;

    connection = new signalR.HubConnectionBuilder()
      .withUrl(notificationHubUrl(), { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    const handleDlpEvent = (payload: unknown) => {
      if (disposed) return;
      const evt = payload as ExtensionDlpEvent;
      setExtensionEvents(prev => [evt, ...prev].slice(0, 100));
    };

    const handleOnline = (payload: unknown) => {
      if (disposed) return;
      const s = payload as ExtensionOnlineStatus & { connectedAt: string };
      setExtensionStatus(prev => {
        const next = new Map(prev);
        next.set(s.deviceId, { ...s, connected: true });
        return next;
      });
    };

    const handleOffline = (payload: unknown) => {
      if (disposed) return;
      const s = payload as ExtensionOnlineStatus & { disconnectedAt: string };
      setExtensionStatus(prev => {
        const next = new Map(prev);
        next.set(s.deviceId, { ...s, connected: false, lastSeen: s.disconnectedAt });
        return next;
      });
    };

    const handleHeartbeat = (payload: unknown) => {
      if (disposed) return;
      const s = payload as { deviceId: string; hostname: string; heartbeatAt: string };
      setExtensionStatus(prev => {
        const next = new Map(prev);
        const existing = next.get(s.deviceId);
        if (existing) next.set(s.deviceId, { ...existing, lastSeen: s.heartbeatAt });
        return next;
      });
    };

    connection.on('ExtensionDlpEvent', handleDlpEvent);
    connection.on('ExtensionOnline', handleOnline);
    connection.on('ExtensionOffline', handleOffline);
    connection.on('ExtensionHeartbeat', handleHeartbeat);

    void connection.start()
      .then(() => { started = true; if (disposed) void connection?.stop(); })
      .catch(() => undefined);

    return () => {
      disposed = true;
      EXTENSION_EVENTS.forEach(e => connection?.off(e));
      if (started) void connection?.stop();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ extensionEvents, extensionStatus, clearEvents }}>
      {children}
    </RealtimeContext.Provider>
  );
};
