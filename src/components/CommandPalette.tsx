'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

/* ── Types ───────────────────────────────────────────────────────────── */
type CommandKind = 'navigate' | 'action';

interface Command {
  id: string;
  label: string;
  description?: string;
  group: string;
  kind: CommandKind;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
}

/* ── Icon builders ───────────────────────────────────────────────────── */
function PageIcon({ active }: { active: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}>
      <rect x="1.5" y="1.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 5h5M4 7.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function ActionIcon({ active }: { active: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}>
      <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Keyboard hint ───────────────────────────────────────────────────── */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0.15rem 0.35rem',
      borderRadius: 'var(--radius-xs)',
      background: 'var(--surface-3)',
      border: '1px solid var(--border-default)',
      fontSize: '0.6875rem',
      fontFamily: 'inherit',
      color: 'var(--text-tertiary)',
      lineHeight: 1,
    }}>
      {children}
    </kbd>
  );
}

/* ── Command registry ────────────────────────────────────────────────── */
function buildCommands(
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
  router: ReturnType<typeof useRouter>,
): Command[] {
  return [
    /* Navigation */
    { id: 'nav-dashboard',   label: 'Dashboard',           description: 'Platform overview and live alerts',      group: 'Navigate', kind: 'navigate', href: '/',           icon: null },
    { id: 'nav-provenance',  label: 'Provenance',           description: 'Certificate ledger and verification',    group: 'Navigate', kind: 'navigate', href: '/provenance', icon: null },
    { id: 'nav-conflict',    label: 'Conflict Arbiter',     description: 'Intent collision detection',             group: 'Navigate', kind: 'navigate', href: '/conflict',   icon: null },
    { id: 'nav-exceptions',  label: 'Review Queue',         description: 'Human-in-the-loop approvals',            group: 'Navigate', kind: 'navigate', href: '/exceptions', icon: null },
    { id: 'nav-identity',    label: 'Agent Identity',       description: 'Registered agents and credentials',      group: 'Navigate', kind: 'navigate', href: '/identity',   icon: null },
    { id: 'nav-audit',       label: 'Audit Trail',          description: 'Governance event timeline',              group: 'Navigate', kind: 'navigate', href: '/audit',      icon: null },

    /* Actions */
    {
      id: 'act-register-agent',
      label: 'Register New Agent',
      description: 'Open the agent registration wizard',
      group: 'Actions',
      kind: 'action',
      icon: null,
      action: () => { router.push('/identity'); showToast('Opening Agent Registration Wizard...'); },
    },
    {
      id: 'act-generate-cert',
      label: 'Generate Certificate',
      description: 'Certify the last LLM trace',
      group: 'Actions',
      kind: 'action',
      icon: null,
      action: () => { router.push('/provenance'); showToast('Generating cryptographic certificate...'); },
    },
    {
      id: 'act-new-policy',
      label: 'Create Conflict Policy',
      description: 'Add a new semantic mediation policy',
      group: 'Actions',
      kind: 'action',
      icon: null,
      action: () => { router.push('/conflict'); showToast('Opening Semantic Policy Creator...'); },
    },
    {
      id: 'act-connect-agent',
      label: 'Connect Agent via API',
      description: 'Generate a JWT and connect an agent',
      group: 'Actions',
      kind: 'action',
      icon: null,
      action: () => showToast('Opening Agent Connection Wizard...'),
    },
    {
      id: 'act-sla-settings',
      label: 'SLA Settings',
      description: 'Configure SLA windows for the review queue',
      group: 'Actions',
      kind: 'action',
      icon: null,
      action: () => { router.push('/exceptions'); showToast('Opening SLA configuration...'); },
    },
    {
      id: 'act-recalculate-risk',
      label: 'Recalculate Fleet Risk',
      description: 'Trigger actuarial recalculation for all agents',
      group: 'Actions',
      kind: 'action',
      icon: null,
      action: () => showToast('Triggering actuarial recalculation for entire fleet...'),
    },
    {
      id: 'act-export-audit',
      label: 'Export Audit Log',
      description: 'Download the governance event log as CSV',
      group: 'Actions',
      kind: 'action',
      icon: null,
      action: () => { router.push('/audit'); showToast('Preparing audit log export...', 'info'); },
    },
    {
      id: 'act-verify-hash',
      label: 'Verify Output Hash',
      description: 'Check a certificate hash against the ledger',
      group: 'Actions',
      kind: 'action',
      icon: null,
      action: () => { router.push('/provenance'); showToast('Opening hash verification tool...'); },
    },
    {
      id: 'act-docs',
      label: 'Open Documentation',
      description: 'RuneSignal developer docs',
      group: 'Actions',
      kind: 'action',
      icon: null,
      action: () => showToast('Opening RuneSignal Documentation...'),
    },
  ];
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function CommandPalette() {
  const router     = useRouter();
  const { showToast } = useToast();
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = buildCommands(showToast, router);

  /* Open on ⌘K / Ctrl+K */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const customHandler = () => setOpen(prev => !prev);
    window.addEventListener('keydown', handler);
    window.addEventListener('runesignal:cmdk', customHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('runesignal:cmdk', customHandler);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = query.trim() === ''
    ? commands
    : commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase())
      );

  const execute = useCallback((cmd: Command) => {
    setOpen(false);
    if (cmd.href) router.push(cmd.href);
    if (cmd.action) cmd.action();
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[selectedIndex]) execute(filtered[selectedIndex]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selectedIndex, execute]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  if (!open) return null;

  const groups = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', backdropFilter: 'blur(4px)', zIndex: 10000 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '20vh',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(580px, 92vw)',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 10001,
        overflow: 'hidden',
        animation: 'fadeUp 0.15s ease forwards',
      }}>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.125rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}><SearchIcon /></span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions, agents…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.9375rem', color: 'var(--text-primary)', fontFamily: 'inherit' }}
          />
          <Kbd>Esc</Kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '0.5rem' }}>
          {Object.entries(groups).map(([group, cmds]) => (
            <div key={group} style={{ marginBottom: '0.25rem' }}>
              <div style={{ padding: '0.4rem 0.75rem 0.25rem', fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', userSelect: 'none' }}>
                {group}
              </div>
              {cmds.map(cmd => {
                const idx        = filtered.indexOf(cmd);
                const isSelected = idx === selectedIndex;
                const isAction   = cmd.kind === 'action';
                return (
                  <button
                    key={cmd.id}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--surface-3)' : 'transparent',
                      border: `1px solid ${isSelected ? 'var(--border-default)' : 'transparent'}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? (isAction ? 'var(--accent-soft)' : 'var(--info-soft)') : 'var(--surface-1)',
                      border: `1px solid ${isSelected ? (isAction ? 'var(--accent-border)' : 'var(--info-border)') : 'var(--border-subtle)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isAction ? <ActionIcon active={isSelected} /> : <PageIcon active={isSelected} />}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{cmd.label}</div>
                      {cmd.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '1px' }}>{cmd.description}</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      {isAction && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.5625rem', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>action</span>
                      )}
                      {isSelected && <Kbd>↵</Kbd>}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 1.125rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Kbd>↵</Kbd> open</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Kbd>Esc</Kbd> close</span>
          <span style={{ marginLeft: 'auto' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </>
  );
}

