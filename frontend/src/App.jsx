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
            <svg className={speech.speechState === 'playing' ? 'logo-bird playing' : 'logo-bird'} viewBox="0 0 36 36" fill="none">
              <rect x="5"  y="14" width="3" height="8"  rx="1.5" fill="#00c896"/>
              <rect x="11" y="10" width="3" height="16" rx="1.5" fill="#00c896"/>
              <rect x="17" y="7"  width="3" height="22" rx="1.5" fill="#00c896"/>
              <rect x="23" y="10" width="3" height="16" rx="1.5" fill="#00c896"/>
              <rect x="29" y="14" width="3" height="8"  rx="1.5" fill="#00c896"/>
            </svg>
            <span className="logo-text">parrot maibaaki</span>
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
