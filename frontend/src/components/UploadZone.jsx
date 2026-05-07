import { useState, useRef } from 'react'

export function UploadZone({ onFile }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <section className="upload-view">
      <div className="upload-hero">

        {/* Animated hero waveform */}
        <svg className="hero-wave" viewBox="0 0 180 72" fill="none" aria-hidden="true">
          <rect x="4"   y="36" width="12" height="28" rx="6" fill="var(--primary)" opacity="0.5"/>
          <rect x="22"  y="22" width="12" height="42" rx="6" fill="var(--primary)" opacity="0.7"/>
          <rect x="40"  y="12" width="12" height="52" rx="6" fill="var(--primary)" opacity="0.85"/>
          <rect x="58"  y="4"  width="12" height="64" rx="6" fill="var(--primary)"/>
          <rect x="76"  y="10" width="12" height="56" rx="6" fill="var(--primary)"/>
          <rect x="94"  y="4"  width="12" height="64" rx="6" fill="var(--primary)"/>
          <rect x="112" y="12" width="12" height="52" rx="6" fill="var(--primary)" opacity="0.85"/>
          <rect x="130" y="22" width="12" height="42" rx="6" fill="var(--primary)" opacity="0.7"/>
          <rect x="148" y="36" width="12" height="28" rx="6" fill="var(--primary)" opacity="0.5"/>
        </svg>

        <h1 className="hero-title">Listen to any document</h1>
        <p className="hero-subtitle">
          Upload a file and parrot maibaaki reads it aloud — with word-by-word highlighting
        </p>

        <div
          className={`drop-zone${dragging ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            hidden
            onChange={e => e.target.files[0] && onFile(e.target.files[0])}
          />
          <div className="drop-inner">
            <svg className="drop-icon" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="6" width="28" height="36" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M30 6v10h10" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M24 20v12M19 27l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="drop-label">Drag your document here</p>
            <p className="drop-or">or</p>
            <button className="btn-browse" onClick={e => { e.stopPropagation(); inputRef.current?.click() }}>
              Browse files
            </button>
            <p className="drop-formats">PDF &nbsp;·&nbsp; DOCX &nbsp;·&nbsp; TXT &nbsp;&nbsp;—&nbsp;&nbsp; up to 50 MB</p>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="features">
          <div className="feature-card">
            <svg className="feature-icon" viewBox="0 0 28 28" fill="none">
              <rect x="4" y="3" width="16" height="22" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M17 3v7h7" stroke="currentColor" strokeWidth="1.8" fill="none"/>
              <line x1="7" y1="13" x2="17" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="7" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <p className="feature-title">Any format</p>
            <p className="feature-desc">PDF, DOCX &amp; TXT up to 50 MB</p>
          </div>

          <div className="feature-card">
            <svg className="feature-icon" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="10" width="6" height="14" rx="3" fill="currentColor" opacity="0.4"/>
              <rect x="11" y="5"  width="6" height="18" rx="3" fill="currentColor"/>
              <rect x="19" y="8"  width="6" height="14" rx="3" fill="currentColor" opacity="0.4"/>
            </svg>
            <p className="feature-title">Word highlight</p>
            <p className="feature-desc">Follows every word in real time</p>
          </div>

          <div className="feature-card">
            <svg className="feature-icon" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M14 14 L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M14 14 L19 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="14" cy="14" r="1.5" fill="currentColor"/>
            </svg>
            <p className="feature-title">Speed control</p>
            <p className="feature-desc">0.5× to 2.5× with voice selection</p>
          </div>
        </div>

      </div>
    </section>
  )
}
