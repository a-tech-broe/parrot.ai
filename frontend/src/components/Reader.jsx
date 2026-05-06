import { TextDisplay } from './TextDisplay'
import { Player } from './Player'

export function Reader({ doc, speech, onNewDoc }) {
  return (
    <section className="reader-view">
      <div className="reader-layout">

        {/* Doc info bar */}
        <div className="doc-bar">
          <div className="doc-info">
            <svg className="doc-icon" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="2" width="12" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 2v5h4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <line x1="6" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="6" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="doc-name">{doc.filename}</span>
            <span className="doc-meta">{doc.wordCount.toLocaleString()} words</span>
          </div>
          <button className="btn-ghost" onClick={onNewDoc}>New document</button>
        </div>

        {/* Scrollable text */}
        <div className="text-container">
          <TextDisplay
            text={doc.text}
            words={doc.words}
            currentWordIdx={speech.currentWordIdx}
          />
        </div>

        {/* Player controls */}
        <Player speech={speech} wordCount={doc.words.length} />

      </div>
    </section>
  )
}
