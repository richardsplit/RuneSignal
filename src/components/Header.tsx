'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@lib/db/supabase';
import { useRouter } from 'next/navigation';

export default function Header({ title }: { title?: string }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
      }
    };
    getUser();
  }, [supabase]);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsProfileOpen(false);
    router.push('/login');
    router.refresh();
  };

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

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
            {userInitial}
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
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>User Profile</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>
                  {userEmail || 'Loading...'}
                </div>
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
                <li style={{ borderTop: '1px solid var(--border-glass)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  <button 
                    onClick={handleSignOut}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 1rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-error-rose)',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }} 
                    className="hover-highlight"
                  >
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
