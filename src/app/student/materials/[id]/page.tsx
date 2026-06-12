'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getMaterial, submitStudentResponse, Material, InteractionCheckpoint, AnswerRecord } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import CustomVideoPlayer from '@/components/CustomVideoPlayer';
import { Play, ArrowLeft, CheckCircle2, AlertCircle, HelpCircle, EyeOff, Clock, Award } from 'lucide-react';

export default function StudentMaterialPlayer() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const materialId = params.id as string;

  const [material, setMaterial] = useState<Material | null>(null);
  const [loadingMaterial, setLoadingMaterial] = useState(true);

  // Video playback control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState<InteractionCheckpoint | null>(null);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<AnswerRecord[]>([]);

  // Image states
  const [imageTimer, setImageTimer] = useState<number>(0);
  const [imageVisible, setImageVisible] = useState(true);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Student Input States
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [shortAnswerText, setShortAnswerText] = useState<string>('');
  
  // Lesson completion states
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [finalTotal, setFinalTotal] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const playerRef = useRef<any>(null);

  useEffect(() => {
    const fetchMat = async () => {
      setLoadingMaterial(true);
      try {
        const docSnap = await getMaterial(materialId);
        if (docSnap) {
          setMaterial(docSnap);
          if (docSnap.mediaType === 'image') {
            const displayTime = docSnap.interactions[0]?.timestamp || 5;
            setImageTimer(displayTime);
          }
        }
      } catch (err) {
        console.error('Error fetching material:', err);
      } finally {
        setLoadingMaterial(false);
      }
    };

    if (!authLoading && profile) {
      if (profile.role !== 'student') {
        router.push('/teacher/dashboard');
      } else {
        fetchMat();
      }
    }
  }, [profile, authLoading, materialId, router]);

  // Image countdown effect
  useEffect(() => {
    if (material && material.mediaType === 'image' && imageVisible && imageTimer > 0) {
      timerIntervalRef.current = setInterval(() => {
        setImageTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setImageVisible(false);
            // Open the question checkpoint (images only have 1 checkpoint corresponding to display duration)
            if (material.interactions.length > 0) {
              setActiveCheckpoint(material.interactions[0]);
              setIsBlurred(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [material, imageVisible, imageTimer]);

  // Video progression checker
  const handleVideoProgress = (progress: { playedSeconds: number }) => {
    if (!material || isBlurred || lessonCompleted) return;

    const currentSec = Math.floor(progress.playedSeconds);
    
    // Find if there is an interaction checkpoint at this second
    const checkpoint = material.interactions.find(
      (item) => item.timestamp === currentSec && !answeredIds.includes(item.id)
    );

    if (checkpoint) {
      setIsPlaying(false);
      setIsBlurred(true);
      setActiveCheckpoint(checkpoint);
    }
  };

  // Student answer submission handler (local queue)
  const handleSubmitCheckpointAnswer = () => {
    if (!activeCheckpoint) return;

    let answerVal = '';
    if (activeCheckpoint.questionType === 'multiple-choice' || activeCheckpoint.questionType === 'true-false') {
      if (!selectedOption) {
        alert('Please select an option.');
        return;
      }
      answerVal = selectedOption;
    } else {
      if (!shortAnswerText.trim()) {
        alert('Please write your response.');
        return;
      }
      answerVal = shortAnswerText.trim();
    }

    // Record the answer
    const newAnswer: AnswerRecord = {
      interactionId: activeCheckpoint.id,
      questionText: activeCheckpoint.questionText,
      studentAnswer: answerVal,
      correctAnswer: activeCheckpoint.correctAnswer,
    };

    const updatedAnswers = [...studentAnswers, newAnswer];
    setStudentAnswers(updatedAnswers);
    setAnsweredIds([...answeredIds, activeCheckpoint.id]);
    
    // Reset inputs
    setSelectedOption('');
    setShortAnswerText('');
    setActiveCheckpoint(null);
    setIsBlurred(false);

    // If it's an image material or video ended, finalize responses
    if (material?.mediaType === 'image') {
      finalizeLesson(updatedAnswers);
    } else {
      // Resume video
      setIsPlaying(true);
    }
  };

  // Submit complete lesson answers to Firebase
  const finalizeLesson = async (finalAnswers: AnswerRecord[]) => {
    if (!profile || !material) return;
    setSubmitting(true);

    try {
      const respId = await submitStudentResponse(profile, material, finalAnswers);
      setSubmissionId(respId);
      
      // Calculate score locally for student feedback
      let correctCount = 0;
      let totalCount = 0;
      finalAnswers.forEach(ans => {
        if (ans.correctAnswer) {
          totalCount++;
          if (ans.studentAnswer.toLowerCase().trim() === ans.correctAnswer.toLowerCase().trim()) {
            correctCount++;
          }
        }
      });

      setFinalScore(correctCount);
      setFinalTotal(totalCount);
      setLessonCompleted(true);
    } catch (err) {
      console.error('Error submitting response:', err);
      alert('Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVideoEnded = () => {
    // Check if there are any remaining unanswered checkpoints
    const remaining = material?.interactions.filter(item => !answeredIds.includes(item.id)) || [];
    if (remaining.length > 0) {
      // Prompt student to answer them (shouldn't happen under normal timeline playing, but safety check)
      setActiveCheckpoint(remaining[0]);
      setIsBlurred(true);
    } else {
      finalizeLesson(studentAnswers);
    }
  };

  if (authLoading || loadingMaterial) {
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
          <p>Loading interactive material...</p>
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

  if (!material) {
    return (
      <div className="container" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <Navbar />
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', margin: '40px auto' }}>
          <AlertCircle size={48} style={{ color: 'rgb(var(--danger))', marginBottom: '16px' }} />
          <h3>Material Not Found</h3>
          <p style={{ color: 'rgb(var(--muted))', marginTop: '8px', marginBottom: '20px' }}>
            The resource you are trying to access does not exist or has been deleted.
          </p>
          <button onClick={() => router.push('/student/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingBottom: '80px', maxWidth: '900px' }}>
        
        {/* Navigation / Header */}
        {!lessonCompleted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <button onClick={() => router.push('/student/dashboard')} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800 }}>{material.title}</h1>
              <p style={{ color: 'rgb(var(--muted))', fontSize: '14px' }}>
                {material.mediaType === 'video' ? 'Watch carefully and answer questions.' : 'Study the image before it disappears.'}
              </p>
            </div>
          </div>
        )}

        {/* State A: Lesson Completed */}
        {lessonCompleted ? (
          <div className="glass-panel animate-fade-in glow-effect" style={{
            maxWidth: '560px',
            margin: '40px auto',
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#d1fae5',
              color: 'rgb(var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle2 size={40} />
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Lesson Completed!</h2>
            <p style={{ color: 'rgb(var(--muted))', marginBottom: '24px' }}>
              Your responses have been successfully submitted to your teacher.
            </p>

            {finalTotal > 0 && (
              <div className="glass-panel" style={{
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '12px',
                marginBottom: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px'
              }}>
                <Award size={32} style={{ color: 'rgb(var(--primary))' }} />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '13px', color: 'rgb(var(--muted))' }}>Your Score</span>
                  <h3 style={{ fontSize: '22px', fontWeight: 850, color: 'rgb(var(--foreground))' }}>
                    {finalScore} / {finalTotal} Correct
                  </h3>
                </div>
              </div>
            )}

            <button onClick={() => router.push('/student/dashboard')} className="btn btn-primary" style={{ width: '100%' }}>
              Return to Dashboard
            </button>
          </div>
        ) : (
          /* State B: Interactive Playback */
          <div style={{ position: 'relative' }}>
            
            {/* Countdown widget for images */}
            {material.mediaType === 'image' && imageVisible && (
              <div className="glass-panel animate-fade-in" style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                background: 'rgba(244,63,94,0.1)',
                border: '1px solid rgba(244,63,94,0.2)'
              }}>
                <Clock size={20} style={{ color: 'rgb(var(--danger))' }} />
                <span style={{ fontSize: '15px', fontWeight: 600 }}>
                  Recall Phase: The image will disappear in <strong style={{ color: 'rgb(var(--danger))' }}>{imageTimer}s</strong>
                </span>
                {/* Visual duration progress bar */}
                <div style={{
                  flex: 1,
                  height: '6px',
                  background: '#e2e8f0',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    background: 'rgb(var(--danger))',
                    width: `${(imageTimer / (material.interactions[0]?.timestamp || 5)) * 100}%`,
                    transition: 'width 1s linear'
                  }} />
                </div>
              </div>
            )}

            {/* Media Player Box */}
            <div className="glass-panel" style={{
              padding: '12px',
              borderRadius: '16px',
              position: 'relative',
              overflow: 'hidden',
              background: '#000',
              aspectRatio: material.mediaType === 'video' ? '16/9' : 'unset',
              minHeight: material.mediaType === 'image' ? '300px' : 'unset',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* Actual Video/Image Wrapper with conditional blur */}
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                filter: isBlurred ? 'blur(25px)' : 'none',
                transition: 'filter 0.4s ease',
                pointerEvents: isBlurred ? 'none' : 'auto'
              }}>
                {material.mediaType === 'video' ? (
                  <CustomVideoPlayer
                    url={material.mediaUrl}
                    playing={isPlaying}
                    onPlayChange={setIsPlaying}
                    isBlurred={isBlurred}
                    onProgress={handleVideoProgress}
                    onEnded={handleVideoEnded}
                  />
                ) : (
                  imageVisible ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={material.mediaUrl}
                      alt="Recall study"
                      style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'rgb(var(--muted))', gap: '8px' }}>
                      <EyeOff size={48} />
                      <p>Image hidden. Please answer the question.</p>
                    </div>
                  )
                )}
              </div>



              {/* Checkpoint Question Overlay Form */}
              {isBlurred && activeCheckpoint && (
                <div className="animate-fade-in" style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.9)',
                  padding: '24px',
                  zIndex: 10
                }}>
                  <div className="glass-panel" style={{
                    width: '100%',
                    maxWidth: '480px',
                    padding: '32px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgb(var(--primary))', marginBottom: '16px' }}>
                      <HelpCircle size={22} />
                      <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Checkpoint Prompt
                      </span>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'rgb(var(--foreground))', marginBottom: '24px', lineHeight: '1.5' }}>
                      {activeCheckpoint.questionText}
                    </h3>

                    {/* Question Type Inputs */}
                    {activeCheckpoint.questionType === 'multiple-choice' && activeCheckpoint.options && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                        {activeCheckpoint.options.map((opt) => {
                          const isSelected = selectedOption === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSelectedOption(opt)}
                              className="glass-panel"
                              style={{
                                padding: '14px 18px',
                                textAlign: 'left',
                                border: isSelected ? '2px solid rgb(var(--primary))' : '1px solid var(--card-border)',
                                background: isSelected ? '#f3e8ff' : '#ffffff',
                                cursor: 'pointer',
                                color: 'rgb(var(--foreground))',
                                fontWeight: 500,
                                fontSize: '14px',
                                borderRadius: '10px'
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activeCheckpoint.questionType === 'true-false' && (
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOption('True')}
                          className="btn"
                          style={{
                            flex: 1,
                            background: selectedOption === 'True' ? '#d1fae5' : '#ffffff',
                            border: selectedOption === 'True' ? '1px solid rgb(var(--accent))' : '1px solid var(--card-border)',
                            color: selectedOption === 'True' ? '#059669' : 'inherit',
                            padding: '14px'
                          }}
                        >
                          True
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedOption('False')}
                          className="btn"
                          style={{
                            flex: 1,
                            background: selectedOption === 'False' ? '#ffe4e6' : '#ffffff',
                            border: selectedOption === 'False' ? '1px solid rgb(var(--danger))' : '1px solid var(--card-border)',
                            color: selectedOption === 'False' ? '#e11d48' : 'inherit',
                            padding: '14px'
                          }}
                        >
                          False
                        </button>
                      </div>
                    )}

                    {activeCheckpoint.questionType === 'short-answer' && (
                      <div className="form-group" style={{ marginBottom: '24px' }}>
                        <textarea
                          value={shortAnswerText}
                          onChange={(e) => setShortAnswerText(e.target.value)}
                          placeholder="Type your answer here..."
                          className="input-field"
                          style={{ height: '100px', resize: 'none' }}
                          required
                        />
                      </div>
                    )}

                    <button
                      onClick={handleSubmitCheckpointAnswer}
                      disabled={submitting}
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {submitting ? 'Submitting...' : 'Submit & Continue'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom details helper */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', color: 'rgb(var(--muted))', fontSize: '14px' }}>
              <span>
                Questions Answered: <strong>{answeredIds.length} / {material.interactions.length}</strong>
              </span>
              {material.mediaType === 'video' && (
                <span>
                  Status: <strong>{isPlaying ? 'Playing' : 'Paused'}</strong>
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
