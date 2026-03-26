'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: '1rem',
      borderBottom: '1px solid var(--border-glass)',
      marginBottom: '1rem',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/documentation" style={{ textDecoration: 'none' }}>
          <button 
            className="btn btn-outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>Documentation</span>
          </button>
        </Link>
        <Link href="/identity" style={{ textDecoration: 'none' }}>
          <button 
            className="btn btn-primary"
          >
            Connect New Agent
          </button>
        </Link>
        
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary-emerald), var(--color-info-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              color: 'white',
              cursor: 'pointer',
              border: '2px solid transparent',
              transition: 'border-color 0.2s',
              ...(isProfileOpen ? { borderColor: 'var(--color-primary-emerald)' } : {})
            }}
          >
            A
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="glass-panel animate-fade-in" style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              width: '240px',
              padding: '0.5rem 0',
              zIndex: 50,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}>
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-glass)', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Admin User</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>admin@trustlayer.dev</div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li>
                  <Link href="/account-settings" style={{ textDecoration: 'none' }}>
                    <button style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 1rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-main)',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }} className="hover-highlight" onClick={() => setIsProfileOpen(false)}>
                      Account Settings
                    </button>
                  </Link>
                </li>
                <li>
                  <Link href="/tenant-management" style={{ textDecoration: 'none' }}>
                    <button style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 1rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-main)',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }} className="hover-highlight" onClick={() => setIsProfileOpen(false)}>
                      Tenant Management
                    </button>
                  </Link>
                </li>
                <li style={{ borderTop: '1px solid var(--border-glass)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  <button style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-error-rose)',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }} className="hover-highlight">
                    Sign Out
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
