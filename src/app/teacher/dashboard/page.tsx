'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTeacherMaterials, getTeacherStudentResponses, Material, StudentResponse } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Copy, Plus, BookOpen, GraduationCap, Calendar, Award, ExternalLink, RefreshCw, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function TeacherDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Track which student response details are expanded
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    if (!profile || profile.role !== 'teacher') return;
    setLoadingData(true);
    try {
      const mats = await getTeacherMaterials(profile.uid);
      const resps = await getTeacherStudentResponses(profile.uid);
      setMaterials(mats);
      setResponses(resps);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.role !== 'teacher') {
        router.push('/student/dashboard');
      } else {
        loadDashboardData();
      }
    }
  }, [profile, authLoading, router]);

  const handleCopyCode = () => {
    if (profile?.classCode) {
      navigator.clipboard.writeText(profile.classCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const toggleExpandResponse = (id: string) => {
    if (expandedResponseId === id) {
      setExpandedResponseId(null);
    } else {
      setExpandedResponseId(id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <p>Loading Dashboard...</p>
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
      <div className="container" style={{ paddingBottom: '80px' }}>
        {/* Top Header Card */}
        <div className="glass-panel glow-effect flex-responsive" style={{
          padding: '32px',
          borderRadius: '16px',
          marginBottom: '32px',
          justifyContent: 'space-between',
          gap: '24px'
        }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 850, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap style={{ color: 'rgb(var(--primary))' }} />
              Teacher Workspace
            </h1>
            <p style={{ color: 'rgb(var(--muted))', fontSize: '15px' }}>
              Welcome back, <strong>{profile?.displayName}</strong>. Create lessons and track student metrics.
            </p>
          </div>

          {/* Class Code Widget */}
          <div className="glass-panel" style={{
            padding: '16px 24px',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '220px',
            borderRadius: '12px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgb(var(--muted))', textTransform: 'uppercase', marginBottom: '6px' }}>
              Your Class Code
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '2px', color: 'rgb(var(--foreground))' }}>
                {profile?.classCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', minHeight: 'unset' }}
                title="Copy Class Code"
              >
                <Copy size={16} />
              </button>
            </div>
            {copySuccess && (
              <span style={{ fontSize: '11px', color: 'rgb(var(--accent))', marginTop: '6px', fontWeight: 600 }}>
                Copied to Clipboard!
              </span>
            )}
          </div>
        </div>

        {/* Dash Grid */}
        <div className="grid-responsive-dashboard">
          
          {/* Materials Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} style={{ color: 'rgb(var(--primary))' }} />
                Your Materials ({materials.length})
              </h2>
              <button
                onClick={() => router.push('/teacher/materials/new')}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                <Plus size={16} />
                Create New
              </button>
            </div>

            {materials.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', color: 'rgb(var(--muted))' }}>
                <BookOpen size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ marginBottom: '16px' }}>No materials published yet.</p>
                <button
                  onClick={() => router.push('/teacher/materials/new')}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px' }}
                >
                  Create Your First Material
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {materials.map((mat) => (
                  <div key={mat.id} className="glass-panel glass-panel-hover" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <span className={`badge ${mat.mediaType === 'video' ? 'badge-teacher' : 'badge-student'}`} style={{ marginBottom: '8px' }}>
                          {mat.mediaType}
                        </span>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'rgb(var(--foreground))' }}>{mat.title}</h3>
                      </div>
                      <span style={{ fontSize: '13px', color: 'rgb(var(--muted))', fontWeight: 500 }}>
                        {mat.interactions.length} Checkpoint{mat.interactions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p style={{ color: 'rgb(var(--muted))', fontSize: '14px', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.5' }}>
                      {mat.description || 'No description provided.'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'rgb(var(--muted))' }}>
                        Created {formatDate(mat.createdAt).split(',')[0]}
                      </span>
                      <a
                        href={mat.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}
                      >
                        Source Link
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student Submissions Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} style={{ color: 'rgb(var(--accent))' }} />
                Student Activity ({responses.length})
              </h2>
              <button
                onClick={loadDashboardData}
                className="btn btn-secondary"
                style={{ padding: '8px', minHeight: 'unset' }}
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {responses.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', color: 'rgb(var(--muted))' }}>
                <Award size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p>Waiting for students to submit responses.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {responses.map((resp) => {
                  const isExpanded = expandedResponseId === resp.id;
                  return (
                    <div key={resp.id} className="glass-panel" style={{
                      padding: '20px',
                      border: isExpanded ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--card-border)',
                      transition: 'border 0.2s ease'
                    }}>
                      {/* Summary Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'rgb(var(--foreground))' }}>{resp.studentName}</h4>
                          <span style={{ fontSize: '12px', color: 'rgb(var(--muted))' }}>{resp.studentEmail}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: resp.totalQuestions > 0 && resp.score === resp.totalQuestions ? '#d1fae5' : '#f1f5f9',
                            color: resp.totalQuestions > 0 && resp.score === resp.totalQuestions ? '#059669' : '#0f172a',
                            fontWeight: 700,
                            fontSize: '14px'
                          }}>
                            {resp.totalQuestions > 0 ? `${resp.score} / ${resp.totalQuestions}` : 'Completed'}
                          </span>
                        </div>
                      </div>

                      {/* Details Segment */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--card-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgb(var(--muted))' }}>
                          <FileText size={14} />
                          <span>{resp.materialTitle}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: 'rgb(var(--muted))' }}>
                            {formatDate(resp.completedAt)}
                          </span>
                          <button
                            onClick={() => toggleExpandResponse(resp.id)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {isExpanded ? (
                              <>Hide Answers <ChevronUp size={12} /></>
                            ) : (
                              <>View Answers <ChevronDown size={12} /></>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Answer Content */}
                      {isExpanded && (
                        <div className="animate-fade-in" style={{
                          marginTop: '16px',
                          padding: '16px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid var(--card-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <h5 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'rgb(var(--muted))', letterSpacing: '0.5px' }}>
                            Response Details:
                          </h5>
                          {resp.answers.map((ans, idx) => (
                            <div key={ans.interactionId} style={{
                              paddingBottom: idx !== resp.answers.length - 1 ? '12px' : '0',
                              borderBottom: idx !== resp.answers.length - 1 ? '1px dashed var(--card-border)' : 'none'
                            }}>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: 'inherit', marginBottom: '4px' }}>
                                Q: {ans.questionText}
                              </p>
                              <p style={{ fontSize: '13px', color: ans.isCorrect === false ? 'rgb(var(--danger))' : ans.isCorrect === true ? 'rgb(var(--accent))' : 'inherit' }}>
                                <strong>Answer:</strong> {ans.studentAnswer}
                                {ans.isCorrect === false && (
                                  <span style={{ fontSize: '11px', marginLeft: '8px', color: 'rgba(244,63,94,0.75)' }}>
                                    (Correct: {ans.correctAnswer})
                                  </span>
                                )}
                                {ans.isCorrect === true && (
                                  <span style={{ fontSize: '11px', marginLeft: '8px', color: 'rgba(16,185,129,0.75)' }}>
                                    ✓ Correct
                                  </span>
                                )}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
