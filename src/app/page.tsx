'use client';

import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Play, Image as ImageIcon, Sparkles, BookOpen, Clock, BarChart3, ChevronRight } from 'lucide-react';

export default function Home() {
  const { user, profile, loading } = useAuth();

  return (
    <>
      <Navbar />
      <main className="container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)',
        paddingTop: '40px',
        paddingBottom: '80px',
      }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', maxWidth: '800px', marginBottom: '64px' }}>
          <div className="badge badge-teacher animate-fade-in" style={{ marginBottom: '20px', padding: '6px 16px', fontSize: '13px' }}>
            <Sparkles size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Next-Gen Learning Experience
          </div>
          
          <h1 className="text-gradient" style={{
            fontSize: '56px',
            fontWeight: 850,
            lineHeight: '1.15',
            letterSpacing: '-1.5px',
            marginBottom: '24px'
          }}>
            Turn Any Video or Image Into an Interactive Quiz
          </h1>
          
          <p style={{
            fontSize: '19px',
            lineHeight: '1.6',
            color: 'rgb(var(--muted))',
            maxWidth: '640px',
            margin: '0 auto 40px'
          }}>
            Set precise checkpoints that pause and blur media, prompting students to answer questions on the fly. Completely multi-tenant and secure.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {loading ? (
              <div style={{ color: 'rgb(var(--muted))' }}>Checking status...</div>
            ) : user ? (
              <Link href={profile?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} className="btn btn-primary" style={{ fontSize: '16px', padding: '14px 28px' }}>
                Go to Dashboard
                <ChevronRight size={18} />
              </Link>
            ) : (
              <>
                <Link href="/auth" className="btn btn-primary" style={{ fontSize: '16px', padding: '14px 28px' }}>
                  Get Started
                  <ChevronRight size={18} />
                </Link>
                <a href="#features" className="btn btn-secondary" style={{ fontSize: '16px', padding: '14px 28px' }}>
                  Learn More
                </a>
              </>
            )}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div id="features" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          width: '100%',
          maxWidth: '1000px',
          marginTop: '40px'
        }}>
          {/* Card 1 */}
          <div className="glass-panel glass-panel-hover" style={{ padding: '32px', borderRadius: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              color: 'rgb(var(--primary))'
            }}>
              <Play size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Timed Video Pauses</h3>
            <p style={{ color: 'rgb(var(--muted))', fontSize: '14px', lineHeight: '1.5' }}>
              Add multiple choice, true/false, or open-ended questions at specific timestamps. The video blurs and stops until answered.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel glass-panel-hover" style={{ padding: '32px', borderRadius: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              color: 'rgb(var(--secondary))'
            }}>
              <Clock size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Flash Image Display</h3>
            <p style={{ color: 'rgb(var(--muted))', fontSize: '14px', lineHeight: '1.5' }}>
              Show an image for a specific duration (e.g. 5 seconds) before hiding it and prompting the student with a recall question.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel glass-panel-hover" style={{ padding: '32px', borderRadius: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              color: 'rgb(var(--accent))'
            }}>
              <BarChart3 size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Real-time Results</h3>
            <p style={{ color: 'rgb(var(--muted))', fontSize: '14px', lineHeight: '1.5' }}>
              Get automated scoring on Multiple Choice and True/False questions. Review text responses directly in the teacher portal.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
