import { useState, useCallback } from 'react'
import { UploadZone } from './components/UploadZone'
import { Reader } from './components/Reader'
import { useSpeech } from './hooks/useSpeech'

function buildWordIndex(text) {
  const words = []
  let i = 0
  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i])) i++
    if (i >= text.length) break
    const start = i
    while (i < text.length && /\S/.test(text[i])) i++
    words.push({ charStart: start, charEnd: i, index: words.length })
  }
  return words
}

export default function App() {
  const [doc, setDoc]         = useState(null)  // null | { filename, text, wordCount, words }
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const speech = useSpeech()

  const handleFile = useCallback(async (file) => {
    setLoading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)

    try {
      const res  = await fetch('/api/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to parse document.')

      const words = buildWordIndex(data.text)
      speech.loadText(data.text, words)
      setDoc({ filename: data.filename, text: data.text, wordCount: data.word_count, words })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [speech])

  const handleNewDoc = useCallback(() => {
    speech.stop()
    setDoc(null)
  }, [speech])

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <a className="logo" href="/">
            <svg className="logo-bird" viewBox="0 0 36 36" fill="none">
              <ellipse cx="18" cy="20" rx="10" ry="11" fill="#00c896"/>
              <ellipse cx="18" cy="13" rx="7" ry="7" fill="#00c896"/>
              <ellipse cx="24" cy="10" rx="4" ry="4" fill="#00c896"/>
              <ellipse cx="14" cy="9" rx="3" ry="3" fill="#00a87a"/>
              <circle cx="25" cy="9" r="1.5" fill="white"/>
              <circle cx="25.5" cy="9" r="0.7" fill="#0d1117"/>
              <path d="M15 16 L12 19 L14 18" fill="#ffd60a" stroke="#ffd60a" strokeWidth="0.5"/>
              <ellipse cx="10" cy="22" rx="4" ry="2.5" fill="#00a87a" transform="rotate(-20 10 22)"/>
            </svg>
            <span className="logo-text">maibaaki — parrot</span>
          </a>
          <span className="badge">beta</span>
        </div>
      </header>

      {/* Pages */}
      {!doc
        ? <UploadZone onFile={handleFile} />
        : <Reader doc={doc} speech={speech} onNewDoc={handleNewDoc} />
      }

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p className="loading-text">Reading your document…</p>
        </div>
      )}

      {/* Error toast */}
      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </div>
  )
}

function Toast({ message, onDismiss }) {
  return (
    <div className="toast show">
      <svg className="toast-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
      <span>{message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: '#fff', marginLeft: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
    </div>
  )
}
