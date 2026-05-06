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
        <div className="hero-bird" aria-hidden="true">🦜</div>
        <h1 className="hero-title">Listen to any document</h1>
        <p className="hero-subtitle">
          Upload a file and Parrot reads it aloud — with word-by-word highlighting
        </p>

        <div
          className={`drop-zone${dragging ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
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
            <button className="btn-browse" onClick={() => inputRef.current?.click()}>
              Browse files
            </button>
            <p className="drop-formats">PDF &nbsp;·&nbsp; DOCX &nbsp;·&nbsp; TXT &nbsp;&nbsp;—&nbsp;&nbsp; up to 50 MB</p>
          </div>
        </div>
      </div>
    </section>
  )
}
