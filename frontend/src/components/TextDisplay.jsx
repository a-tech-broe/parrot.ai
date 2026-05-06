import { useEffect, useRef, useMemo } from 'react'

export function TextDisplay({ text, words, currentWordIdx }) {
  const containerRef  = useRef(null)
  const prevActiveRef = useRef(null)

  // Build renderable parts once per document — no re-render on word change
  const parts = useMemo(() => {
    if (!text || !words.length) return []
    const out = []
    let cursor = 0
    for (const w of words) {
      if (w.charStart > cursor) out.push({ type: 'text', content: text.slice(cursor, w.charStart) })
      out.push({ type: 'word', content: text.slice(w.charStart, w.charEnd), index: w.index })
      cursor = w.charEnd
    }
    if (cursor < text.length) out.push({ type: 'text', content: text.slice(cursor) })
    return out
  }, [text, words])

  // Direct DOM update — avoids full re-render on every word boundary
  useEffect(() => {
    if (!containerRef.current) return

    if (prevActiveRef.current) {
      prevActiveRef.current.classList.remove('active')
      prevActiveRef.current = null
    }

    if (currentWordIdx >= 0) {
      const span = containerRef.current.querySelector(`[data-idx="${currentWordIdx}"]`)
      if (span) {
        span.classList.add('active')
        span.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        prevActiveRef.current = span
      }
    }
  }, [currentWordIdx])

  return (
    <div ref={containerRef} className="text-display">
      {parts.map((p, i) =>
        p.type === 'text'
          ? p.content
          : <span key={p.index} data-idx={p.index} className="word">{p.content}</span>
      )}
    </div>
  )
}
