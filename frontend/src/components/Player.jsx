import { useState, useEffect, useRef } from 'react'

const fmt = (s) => {
  const secs = Math.max(0, s)
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

export function Player({ speech, wordCount }) {
  const { speechState, voices, selectedVoice, rate, currentWordIdx,
          play, pause, resume, stop, skip, seekTo, setVoice, setRate } = speech

  const [elapsed, setElapsed] = useState(0)
  const timerRef  = useRef(null)
  const startRef  = useRef(0)
  const baseRef   = useRef(0)

  const totalSecs = (wordCount / 150) * 60 / rate
  const progress  = wordCount > 1 ? Math.max(0, currentWordIdx) / (wordCount - 1) : 0

  /* ── Timer ──────────────────────────────────────────── */
  useEffect(() => {
    if (speechState === 'playing') {
      startRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(baseRef.current + (Date.now() - startRef.current) / 1000)
      }, 500)
    } else {
      clearInterval(timerRef.current)
      if (speechState === 'paused') {
        baseRef.current += (Date.now() - startRef.current) / 1000
      } else {
        baseRef.current = 0
        setElapsed(0)
      }
    }
    return () => clearInterval(timerRef.current)
  }, [speechState])

  /* ── Progress thumb position ─────────────────────────── */
  const pct = `${(progress * 100).toFixed(1)}%`

  const handleProgressClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    seekTo((e.clientX - r.left) / r.width)
  }

  /* ── Voice options ──────────────────────────────────── */
  const voiceOptions = voices.map((v, i) => (
    <option key={i} value={i}>{v.name} ({v.lang})</option>
  ))

  const selectedIdx = voices.indexOf(selectedVoice)

  return (
    <div className="player" data-state={speechState}>
      {/* Progress */}
      <div className="progress-section">
        <span className="time-label">{fmt(elapsed)}</span>
        <div className="progress-track" onClick={handleProgressClick}>
          <div className="progress-fill" style={{ width: pct }} />
          <div className="progress-thumb" style={{ left: pct }} />
        </div>
        <span className="time-label">{fmt(totalSecs)}</span>
      </div>

      {/* Controls */}
      <div className="controls-section">
        <button className="ctrl-btn" title="Back 50 words (Alt+←)" onClick={() => skip(-50)}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>

        <div className={`live-wave${speechState === 'playing' ? ' active' : ''}`} aria-hidden="true">
          <span/><span/><span/><span/><span/>
        </div>

        <button
          className="ctrl-btn ctrl-play"
          title={speechState === 'playing' ? 'Pause (Space)' : 'Play (Space)'}
          onClick={() => speechState === 'playing' ? pause() : speechState === 'paused' ? resume() : play()}
        >
          {speechState === 'playing'
            ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          }
        </button>

        <button className="ctrl-btn" title="Stop (Esc)" onClick={stop}>
          <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
        </button>

        <div className={`live-wave${speechState === 'playing' ? ' active' : ''}`} aria-hidden="true">
          <span/><span/><span/><span/><span/>
        </div>

        <button className="ctrl-btn" title="Forward 50 words (Alt+→)" onClick={() => skip(+50)}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm8.5-6V6H17v12h-2.5z"/></svg>
        </button>
      </div>

      {/* Settings */}
      <div className="settings-section">
        <div className="setting-group">
          <label className="setting-label" htmlFor="voice-select">Voice</label>
          <select
            id="voice-select"
            className="setting-select"
            value={selectedIdx >= 0 ? selectedIdx : 0}
            onChange={e => setVoice(voices[+e.target.value])}
          >
            {voiceOptions}
          </select>
        </div>

        <div className="setting-group">
          <label className="setting-label" htmlFor="speed-slider">Speed</label>
          <div className="speed-wrap">
            <input
              id="speed-slider"
              type="range"
              className="speed-slider"
              min="0.5" max="2.5" step="0.1"
              value={rate}
              onChange={e => setRate(parseFloat(e.target.value))}
            />
            <span className="speed-val">{rate.toFixed(1)}×</span>
          </div>
        </div>
      </div>
    </div>
  )
}
