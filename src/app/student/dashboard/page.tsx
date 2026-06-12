'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getStudentMaterials, Material } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { BookOpen, Users, Play, Image as ImageIcon, Sparkles, ChevronRight, GraduationCap } from 'lucide-react';

export default function StudentDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!profile || profile.role !== 'student' || !profile.teacherId) return;
      setLoadingData(true);
      try {
        const mats = await getStudentMaterials(profile.teacherId);
        setMaterials(mats);
      } catch (err) {
        console.error('Error fetching student materials:', err);
      } finally {
        setLoadingData(false);
      }
    };

    if (!authLoading && profile) {
      if (profile.role !== 'student') {
        router.push('/teacher/dashboard');
      } else {
        fetchMaterials();
      }
    }
  }, [profile, authLoading, router]);

  if (authLoading || (loadingData && materials.length === 0)) {
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
          <p>Loading your classroom...</p>
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
    <>
      <Navbar />
      <div className="container" style={{ paddingBottom: '80px', maxWidth: '800px' }}>
        {/* Student Welcome Card */}
        <div className="glass-panel glow-effect flex-responsive" style={{
          padding: '32px',
          borderRadius: '16px',
          marginBottom: '32px',
          justifyContent: 'space-between',
          gap: '24px'
        }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 850, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles style={{ color: 'rgb(var(--primary))' }} />
              Student Dashboard
            </h1>
            <p style={{ color: 'rgb(var(--muted))', fontSize: '15px' }}>
              Welcome back, <strong>{profile?.displayName}</strong>. Complete your teacher&apos;s assignments below.
            </p>
          </div>

          {/* Classroom Membership Card */}
          <div className="glass-panel" style={{
            padding: '16px 24px',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: '12px',
            minWidth: '200px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgb(var(--muted))', textTransform: 'uppercase', marginBottom: '6px' }}>
              Joined Classroom Code
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'rgb(var(--foreground))', letterSpacing: '1px' }}>
              {profile?.classCode}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'rgb(var(--accent))', fontSize: '12px', fontWeight: 600 }}>
              <Users size={12} />
              Connected to Teacher
            </div>
          </div>
        </div>

        {/* Assigned materials */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} style={{ color: 'rgb(var(--primary))' }} />
            Assigned Materials ({materials.length})
          </h2>

          {materials.length === 0 ? (
            <div className="glass-panel" style={{ padding: '64px 32px', textAlign: 'center', color: 'rgb(var(--muted))' }}>
              <BookOpen size={40} style={{ marginBottom: '16px', opacity: 0.4 }} />
              <h3 style={{ color: 'rgb(var(--foreground))', fontSize: '18px', marginBottom: '8px' }}>Your Classroom is Empty</h3>
              <p style={{ fontSize: '14px', maxWidth: '380px', margin: '0 auto' }}>
                Your teacher hasn&apos;t published any materials yet. Check back later or ask them to add some interactive lessons!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {materials.map((mat) => (
                <div key={mat.id} className="glass-panel glass-panel-hover flex-responsive-start" style={{
                  padding: '24px',
                  justifyContent: 'space-between',
                  gap: '20px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span className={`badge ${mat.mediaType === 'video' ? 'badge-teacher' : 'badge-student'}`}>
                        {mat.mediaType === 'video' ? 'Video' : 'Image'}
                      </span>
                      <span style={{ fontSize: '13px', color: 'rgb(var(--muted))' }}>
                        {mat.interactions.length} Question{mat.interactions.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '19px', fontWeight: 700, color: 'rgb(var(--foreground))', marginBottom: '8px' }}>
                      {mat.title}
                    </h3>
                    
                    <p style={{ color: 'rgb(var(--muted))', fontSize: '14px', lineHeight: '1.5' }}>
                      {mat.description || 'No description provided for this lesson.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignSelf: 'stretch', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Link
                      href={`/student/materials/${mat.id}`}
                      className="btn btn-primary glow-effect"
                      style={{ padding: '10px 20px', fontSize: '14px', whiteSpace: 'nowrap' }}
                    >
                      {mat.mediaType === 'video' ? <Play size={16} /> : <ImageIcon size={16} />}
                      Start Lesson
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
