'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { createUserProfile } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { LogIn, GraduationCap, Users, ArrowRight, Sparkles } from 'lucide-react';

export default function AuthPage() {
  const { user, profile, loading, isFirebaseReady, signInWithGoogle, refreshProfile } = useAuth();
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [classCode, setClassCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Redirect if they already have a complete profile
  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else if (profile.role === 'student') {
        router.push('/student/dashboard');
      }
    }
  }, [user, profile, loading, router]);

  const handleRoleSelection = async (selectedRole: 'teacher' | 'student') => {
    setRole(selectedRole);
    setAuthError(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!role) {
      setAuthError('Please select a role.');
      return;
    }

    setSubmitting(true);
    setAuthError(null);

    try {
      if (role === 'student' && !classCode.trim()) {
        throw new Error('Please enter your teacher\'s Class Code.');
      }

      await createUserProfile(user, role, role === 'student' ? classCode : null);
      await refreshProfile();
      
      if (role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{
            border: '4px solid #e2e8f0',
            borderTop: '4px solid rgb(var(--primary))',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p>Loading account details...</p>
        </div>
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '24px',
      position: 'relative',
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 className="text-gradient animate-fade-in" style={{
          fontSize: '38px',
          fontWeight: 800,
          letterSpacing: '-1px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <Sparkles style={{ color: 'rgb(var(--primary))' }} size={36} />
          InteractLearn
        </h1>
        <p style={{ color: 'rgb(var(--muted))', marginTop: '8px', fontSize: '16px' }}>
          Multi-tenant timed checkpoints on videos & images
        </p>
      </div>

      <div className="glass-panel glow-effect" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '40px',
        animation: 'fadeIn 0.5s ease',
      }}>
        {/* State 1: Need login */}
        {!user ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Welcome</h2>

            {!isFirebaseReady ? (
              // Setup instructions when Firebase keys are missing
              <div style={{
                background: '#fff8ed',
                border: '1px solid #f59e0b',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'left',
                marginBottom: '16px'
              }}>
                <p style={{ fontWeight: 700, color: '#92400e', marginBottom: '12px', fontSize: '14px' }}>⚙️ Setup Required — Add your Firebase API Key</p>
                <p style={{ color: '#78350f', fontSize: '13px', marginBottom: '10px' }}>Open the file <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>.env.local</code> in your project folder and replace <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>YOUR_API_KEY_HERE</code> with your real API key.</p>
                <p style={{ color: '#78350f', fontSize: '13px', marginBottom: '10px' }}>To find it: <strong>Firebase Console → Project Settings → Your Apps → Config → apiKey</strong></p>
                <p style={{ color: '#78350f', fontSize: '13px', marginBottom: '10px' }}>Also replace <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>YOUR_APP_ID_HERE</code> with your <strong>appId</strong> from the same Config section.</p>
                <p style={{ color: '#78350f', fontSize: '13px' }}>After saving, restart the server: <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>Ctrl+C</code> then <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>npm run dev</code></p>
              </div>
            ) : (
              <p style={{ color: 'rgb(var(--muted))', marginBottom: '32px', lineHeight: '1.5' }}>
                Sign in with your Google account to create or access your classroom materials.
              </p>
            )}

            <button
              onClick={() => signInWithGoogle()}
              disabled={!isFirebaseReady}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', opacity: isFirebaseReady ? 1 : 0.5, cursor: isFirebaseReady ? 'pointer' : 'not-allowed' }}
            >
              <LogIn size={20} />
              Sign in with Google
            </button>
            <p style={{ color: 'rgb(var(--muted))', fontSize: '12px', marginTop: '16px' }}>
              {isFirebaseReady ? 'Securely powered by Google Authentication' : 'Button disabled until API keys are configured'}
            </p>
          </div>
        ) : (
          /* State 2: Logged in but needs role setup */
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
              Setup Your Profile
            </h2>
            <p style={{
              color: 'rgb(var(--muted))',
              marginBottom: '24px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              Logged in as <strong>{user.email}</strong>
            </p>

            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '24px' }}>
                <span className="form-label" style={{ marginBottom: '12px' }}>Choose your role:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <button
                    type="button"
                    onClick={() => handleRoleSelection('teacher')}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      border: role === 'teacher' ? '2px solid rgb(var(--primary))' : '1px solid var(--card-border)',
                      background: role === 'teacher' ? '#f3e8ff' : '#ffffff',
                      textAlign: 'center',
                      borderRadius: '12px',
                    }}
                  >
                    <GraduationCap size={32} style={{ color: role === 'teacher' ? 'rgb(var(--primary))' : 'rgb(var(--muted))' }} />
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>Teacher</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelection('student')}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      border: role === 'student' ? '2px solid rgb(var(--primary))' : '1px solid var(--card-border)',
                      background: role === 'student' ? '#f3e8ff' : '#ffffff',
                      textAlign: 'center',
                      borderRadius: '12px',
                    }}
                  >
                    <Users size={32} style={{ color: role === 'student' ? 'rgb(var(--primary))' : 'rgb(var(--muted))' }} />
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>Student</span>
                  </button>
                </div>
              </div>

              {role === 'student' && (
                <div className="form-group animate-fade-in">
                  <label className="form-label" htmlFor="classCode">Classroom Join Code</label>
                  <input
                    type="text"
                    id="classCode"
                    placeholder="Enter 6-digit Code (e.g. AB12CD)"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="input-field"
                    maxLength={6}
                    style={{ textTransform: 'uppercase', textAlign: 'center', letterSpacing: '2px', fontSize: '18px' }}
                    required
                  />
                  <p style={{ color: 'rgb(var(--muted))', fontSize: '12px', marginTop: '6px' }}>
                    Ask your teacher for their unique class code to join.
                  </p>
                </div>
              )}

              {authError && (
                <div style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: 'rgb(var(--danger))',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '20px',
                }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !role}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '14px 24px',
                  opacity: submitting || !role ? 0.6 : 1,
                  cursor: submitting || !role ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Registering...' : 'Get Started'}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
