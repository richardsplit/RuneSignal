'use client';

import React from 'react';

interface NotificationSetting {
  id: string;
  label: string;
  desc: string;
  enabled: boolean;
}

interface NotificationsTabProps {
  notifications: NotificationSetting[];
  onToggle: (id: string) => void;
}

export default function NotificationsTab({ notifications, onToggle }: NotificationsTabProps) {
  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '2rem', color: 'var(--color-text-main)' }}>Notifications</h2>
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        {notifications.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.desc}</div>
            </div>
            <div 
              onClick={() => onToggle(item.id)}
              style={{ 
                width: '40px', 
                height: '20px', 
                background: item.enabled ? 'var(--color-primary-emerald)' : 'rgba(255,255,255,0.1)', 
                borderRadius: '10px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ 
                width: '16px', 
                height: '16px', 
                background: 'white', 
                borderRadius: '50%', 
                position: 'absolute', 
                top: '2px', 
                left: item.enabled ? '22px' : '2px',
                transition: 'all 0.2s'
              }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
