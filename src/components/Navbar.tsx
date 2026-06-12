'use client';

import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { LogOut, GraduationCap, Users, Sparkles } from 'lucide-react';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();

  if (!user) return null;

  return (
    <header className="glass-panel" style={{
      borderRadius: '0 0 16px 16px',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      padding: '16px 24px',
      marginBottom: '32px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 0
      }}>
        {/* Brand */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <Sparkles style={{ color: 'rgb(var(--primary))' }} size={24} />
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'rgb(var(--foreground))', letterSpacing: '-0.5px' }}>
              InteractLearn
            </span>
          </div>
        </Link>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {profile?.role === 'teacher' ? (
              <span className="badge badge-teacher">
                <GraduationCap size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Teacher
              </span>
            ) : profile?.role === 'student' ? (
              <span className="badge badge-student">
                <Users size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Student
              </span>
            ) : null}
            <span className="hide-on-mobile" style={{ fontSize: '14px', color: 'rgb(var(--muted))' }}>
              {user.displayName || user.email}
            </span>
          </div>

          <button
            onClick={signOut}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
