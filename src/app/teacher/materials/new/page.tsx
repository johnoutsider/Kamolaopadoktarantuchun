'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { createMaterial, InteractionCheckpoint } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import CustomVideoPlayer from '@/components/CustomVideoPlayer';
import { Play, Plus, Trash2, ArrowLeft, Save, HelpCircle, FileVideo, FileImage } from 'lucide-react';

export default function NewMaterialPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const playerRef = useRef<any>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [mediaUrl, setMediaUrl] = useState('');
  const [imageDuration, setImageDuration] = useState(5); // Default 5 seconds for images
  const [interactions, setInteractions] = useState<InteractionCheckpoint[]>([]);

  // Preview states
  const [previewActive, setPreviewActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);

  // New question form states
  const [selectedTimestamp, setSelectedTimestamp] = useState<number>(0);
  const [questionType, setQuestionType] = useState<'multiple-choice' | 'true-false' | 'short-answer'>('multiple-choice');
  const [questionText, setQuestionText] = useState('');
  const [mcOptions, setMcOptions] = useState<string[]>(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMcOption = () => {
    setMcOptions([...mcOptions, '']);
  };

  const handleRemoveMcOption = (index: number) => {
    if (mcOptions.length > 2) {
      setMcOptions(mcOptions.filter((_, i) => i !== index));
    }
  };

  const handleMcOptionChange = (index: number, value: string) => {
    const updated = [...mcOptions];
    updated[index] = value;
    setMcOptions(updated);
  };

  const startAddQuestion = () => {
    // If it's a video, get current play time
    if (mediaType === 'video') {
      setSelectedTimestamp(currentTimeSec);
    } else {
      // For images, questions trigger after the display duration
      setSelectedTimestamp(imageDuration);
    }
    
    // Reset form
    setQuestionText('');
    setQuestionType('multiple-choice');
    setMcOptions(['', '']);
    setCorrectAnswer('');
    setIsAddingQuestion(true);
  };

  const handleSaveQuestion = () => {
    if (!questionText.trim()) {
      alert('Please enter the question text.');
      return;
    }

    const newCheckpoint: InteractionCheckpoint = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: selectedTimestamp,
      questionType,
      questionText,
    };

    if (questionType === 'multiple-choice') {
      const filteredOptions = mcOptions.map(o => o.trim()).filter(Boolean);
      if (filteredOptions.length < 2) {
        alert('Please provide at least 2 options for multiple choice.');
        return;
      }
      if (!correctAnswer) {
        alert('Please specify the correct answer option.');
        return;
      }
      newCheckpoint.options = filteredOptions;
      newCheckpoint.correctAnswer = correctAnswer;
    } else if (questionType === 'true-false') {
      if (!correctAnswer) {
        alert('Please specify the correct answer (True or False).');
        return;
      }
      newCheckpoint.options = ['True', 'False'];
      newCheckpoint.correctAnswer = correctAnswer;
    }

    setInteractions([...interactions, newCheckpoint].sort((a, b) => a.timestamp - b.timestamp));
    setIsAddingQuestion(false);
  };

  const handleDeleteQuestion = (id: string) => {
    setInteractions(interactions.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || profile.role !== 'teacher') return;
    if (!title.trim() || !mediaUrl.trim()) {
      setError('Title and Media URL are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createMaterial(profile.uid, {
        title: title.trim(),
        description: description.trim(),
        mediaType,
        mediaUrl: mediaUrl.trim(),
        interactions,
      });
      router.push('/teacher/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create material.');
      setSaving(false);
    }
  };

  // Helper to convert seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingBottom: '80px', maxWidth: '1000px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button onClick={() => router.push('/teacher/dashboard')} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Create New Material</h1>
            <p style={{ color: 'rgb(var(--muted))' }}>Set up media link and questions.</p>
          </div>
        </div>

        <div className="grid-responsive-creator">
          {/* Form Side */}
          <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '32px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Material Title</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cell Structure Biology Lesson"
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="desc">Description</label>
              <textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what students will learn."
                className="input-field"
                style={{ height: '80px', resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Media Type</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  type="button"
                  onClick={() => { setMediaType('video'); setInteractions([]); setPreviewActive(false); }}
                  className="btn"
                  style={{
                    flex: 1,
                    background: mediaType === 'video' ? '#f3e8ff' : '#ffffff',
                    border: mediaType === 'video' ? '1px solid rgb(var(--primary))' : '1px solid var(--card-border)',
                  }}
                >
                  <FileVideo size={18} style={{ color: mediaType === 'video' ? 'rgb(var(--primary))' : 'inherit' }} />
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => { setMediaType('image'); setInteractions([]); setPreviewActive(false); }}
                  className="btn"
                  style={{
                    flex: 1,
                    background: mediaType === 'image' ? '#f3e8ff' : '#ffffff',
                    border: mediaType === 'image' ? '1px solid rgb(var(--primary))' : '1px solid var(--card-border)',
                  }}
                >
                  <FileImage size={18} style={{ color: mediaType === 'image' ? 'rgb(var(--primary))' : 'inherit' }} />
                  Image
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mediaUrl">
                {mediaType === 'video' ? 'YouTube or Video URL' : 'Direct Image URL'}
              </label>
              <input
                type="url"
                id="mediaUrl"
                value={mediaUrl}
                onChange={(e) => {
                  let val = e.target.value;
                  // Auto-prepend https:// if they just start typing www.
                  if (val.startsWith('www.')) {
                    val = 'https://' + val;
                  }
                  setMediaUrl(val);
                  setPreviewActive(false);
                }}
                placeholder={mediaType === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/image.jpg'}
                className="input-field"
                pattern="https?://.+"
                title="Include http:// or https:// in the URL"
                required
              />
              <button
                type="button"
                onClick={() => setPreviewActive(!!mediaUrl)}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '12px', fontSize: '13px', padding: '8px 16px' }}
                disabled={!mediaUrl}
              >
                Load Preview
              </button>
            </div>

            {mediaType === 'image' && (
              <div className="form-group animate-fade-in">
                <label className="form-label" htmlFor="imageDuration">Display Duration (Seconds)</label>
                <input
                  type="number"
                  id="imageDuration"
                  value={imageDuration}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 5);
                    setImageDuration(val);
                    // Update any existing interaction timestamp for the image
                    setInteractions(interactions.map(item => ({ ...item, timestamp: val })));
                  }}
                  className="input-field"
                  min={1}
                />
                <p style={{ color: 'rgb(var(--muted))', fontSize: '12px', marginTop: '6px' }}>
                  Students will view the image for this long before it disappears and the question appears.
                </p>
              </div>
            )}

            {error && (
              <div style={{ color: 'rgb(var(--danger))', fontSize: '14px', marginBottom: '20px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || interactions.length === 0}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', opacity: saving || interactions.length === 0 ? 0.6 : 1 }}
            >
              <Save size={18} />
              {saving ? 'Publishing...' : 'Publish Material'}
            </button>
            {interactions.length === 0 && (
              <p style={{ color: 'rgb(var(--danger))', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                * Add at least 1 question before publishing.
              </p>
            )}
          </form>

          {/* Interactive Player & Questions Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Player Preview Container */}
            <div className="glass-panel" style={{ padding: '24px', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Media Preview</h3>
              
              {previewActive && mediaUrl ? (
                <div>
                  {mediaType === 'video' ? (
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', background: '#000' }}>
                      <CustomVideoPlayer
                        url={mediaUrl}
                        playing={isPlaying}
                        onPlayChange={setIsPlaying}
                        onProgress={(prog) => setCurrentTimeSec(Math.floor(prog.playedSeconds))}
                      />
                    </div>
                  ) : (
                    <div style={{ width: '100%', textAlign: 'center', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    {mediaType === 'video' && (
                      <span style={{ fontSize: '14px', color: 'rgb(var(--muted))' }}>
                        Current Time: <strong>{formatTime(currentTimeSec)}</strong>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={startAddQuestion}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '14px' }}
                    >
                      <Plus size={16} />
                      Add Question Here
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgb(var(--muted))', border: '2px dashed var(--card-border)', borderRadius: '10px' }}>
                  <HelpCircle size={32} style={{ marginBottom: '12px' }} />
                  <p>Paste a URL and click &quot;Load Preview&quot; to begin building your interactive checkpoints.</p>
                </div>
              )}
            </div>

            {isAddingQuestion && (
              <div className="glass-panel animate-fade-in" style={{ padding: '24px', border: '1px solid rgb(var(--primary))', background: '#f8fafc' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HelpCircle size={18} style={{ color: 'rgb(var(--primary))' }} />
                  New Question Checkpoint
                </h3>

                {mediaType === 'video' && (
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Trigger Time (Minutes)</label>
                      <input
                        type="number"
                        min={0}
                        value={Math.floor(selectedTimestamp / 60)}
                        onChange={(e) => setSelectedTimestamp((parseInt(e.target.value) || 0) * 60 + (selectedTimestamp % 60))}
                        className="input-field"
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Trigger Time (Seconds)</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={selectedTimestamp % 60}
                        onChange={(e) => setSelectedTimestamp(Math.floor(selectedTimestamp / 60) * 60 + Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="input-field"
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Question Type</label>
                  <select
                    value={questionType}
                    onChange={(e: any) => setQuestionType(e.target.value)}
                    className="input-field"
                  >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="true-false">True / False</option>
                    <option value="short-answer">Short Answer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Question Text</label>
                  <input
                    type="text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="e.g. What is the powerhouse of the cell?"
                    className="input-field"
                    required
                  />
                </div>

                {/* Question Type Specific Fields */}
                {questionType === 'multiple-choice' && (
                  <div className="animate-fade-in" style={{ marginBottom: '20px' }}>
                    <label className="form-label">Options & Correct Answer</label>
                    {mcOptions.map((opt, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="radio"
                          name="correctOption"
                          value={opt}
                          checked={correctAnswer === opt && opt !== ''}
                          onChange={() => setCorrectAnswer(opt)}
                          disabled={!opt.trim()}
                          style={{ accentColor: 'rgb(var(--primary))' }}
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleMcOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="input-field"
                          style={{ padding: '8px 12px', fontSize: '14px' }}
                          required
                        />
                        {mcOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMcOption(index)}
                            className="btn btn-secondary"
                            style={{ padding: '8px' }}
                          >
                            <Trash2 size={16} style={{ color: 'rgb(var(--danger))' }} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddMcOption}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', marginTop: '6px' }}
                    >
                      + Add Option
                    </button>
                    <p style={{ color: 'rgb(var(--muted))', fontSize: '11px', marginTop: '6px' }}>
                      * Fill in options first, then select the radio button next to the correct answer.
                    </p>
                  </div>
                )}

                {questionType === 'true-false' && (
                  <div className="form-group animate-fade-in">
                    <label className="form-label">Correct Answer</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer('True')}
                        className="btn"
                        style={{
                          flex: 1,
                          background: correctAnswer === 'True' ? '#d1fae5' : '#ffffff',
                          border: correctAnswer === 'True' ? '1px solid rgb(var(--accent))' : '1px solid var(--card-border)',
                          color: correctAnswer === 'True' ? '#059669' : 'inherit'
                        }}
                      >
                        True
                      </button>
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer('False')}
                        className="btn"
                        style={{
                          flex: 1,
                          background: correctAnswer === 'False' ? '#ffe4e6' : '#ffffff',
                          border: correctAnswer === 'False' ? '1px solid rgb(var(--danger))' : '1px solid var(--card-border)',
                          color: correctAnswer === 'False' ? '#e11d48' : 'inherit'
                        }}
                      >
                        False
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddingQuestion(false)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuestion}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    Save Question
                  </button>
                </div>
              </div>
            )}

            {/* Checkpoints List */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Questions Checkpoints ({interactions.length})</h3>
              {interactions.length === 0 ? (
                <p style={{ color: 'rgb(var(--muted))', fontSize: '14px' }}>No checkpoints set yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {interactions.map((q, idx) => (
                    <div key={q.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--card-border)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: 'rgba(139,92,246,0.1)',
                            color: 'rgb(var(--primary))',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {mediaType === 'video' ? formatTime(q.timestamp) : `${q.timestamp}s`}
                          </span>
                          <span style={{ fontSize: '12px', color: 'rgb(var(--muted))', textTransform: 'capitalize' }}>
                            {q.questionType.replace('-', ' ')}
                          </span>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgb(var(--foreground))' }}>{idx + 1}. {q.questionText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px' }}
                      >
                        <Trash2 size={16} style={{ color: 'rgb(var(--danger))' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
