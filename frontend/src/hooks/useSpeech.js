import { useState, useRef, useCallback, useEffect } from 'react'

export function useSpeech() {
  const [speechState, setSpeechState] = useState('idle') // idle | playing | paused
  const [voices, setVoices]           = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [rate, setRate]               = useState(1.0)
  const [currentWordIdx, setCurrentWordIdx] = useState(-1)

  const synthesis  = window.speechSynthesis
  const textRef    = useRef('')
  const wordsRef   = useRef([])
  const charOffset = useRef(0)
  const curWordRef = useRef(0)

  /* ── Voices ───────────────────────────────────────────── */
  const loadVoices = useCallback(() => {
    let all = synthesis.getVoices()
    const en = all.filter(v => v.lang.startsWith('en'))
    if (en.length) all = en
    setVoices(all)
    setSelectedVoice(prev => prev ?? all.find(v => v.default) ?? all[0] ?? null)
  }, [])

  useEffect(() => {
    loadVoices()
    if ('onvoiceschanged' in synthesis) synthesis.onvoiceschanged = loadVoices
  }, [loadVoices])

  /* ── Word index helpers ──────────────────────────────── */
  const findWord = useCallback((absChar) => {
    const words = wordsRef.current
    let lo = 0, hi = words.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const w = words[mid]
      if (absChar < w.charStart)     hi = mid - 1
      else if (absChar >= w.charEnd) lo = mid + 1
      else return mid
    }
    return lo < words.length ? lo : -1
  }, [])

  /* ── Core play ───────────────────────────────────────── */
  const _speak = useCallback((fromWord, voiceOverride, rateOverride) => {
    synthesis.cancel()
    const words = wordsRef.current
    const text  = textRef.current
    if (!text || !words.length) return

    const startIdx  = Math.max(0, Math.min(fromWord, words.length - 1))
    const startChar = words[startIdx].charStart
    charOffset.current = startChar
    curWordRef.current = startIdx

    const utt = new SpeechSynthesisUtterance(text.slice(startChar))
    utt.voice = voiceOverride ?? selectedVoice
    utt.rate  = rateOverride  ?? rate
    utt.pitch = 1

    utt.onboundary = e => {
      if (e.name !== 'word') return
      const idx = findWord(charOffset.current + e.charIndex)
      if (idx >= 0) { curWordRef.current = idx; setCurrentWordIdx(idx) }
    }

    utt.onend = () => {
      setSpeechState('idle')
      setCurrentWordIdx(-1)
      curWordRef.current = 0
    }

    utt.onerror = e => { if (e.error !== 'interrupted') setSpeechState('idle') }

    synthesis.speak(utt)
    setSpeechState('playing')
    setCurrentWordIdx(startIdx)
  }, [selectedVoice, rate, findWord])

  /* ── Public API ──────────────────────────────────────── */
  const loadText = useCallback((text, words) => {
    textRef.current  = text
    wordsRef.current = words
    curWordRef.current = 0
    setCurrentWordIdx(-1)
  }, [])

  const play   = useCallback((fromWord) => _speak(fromWord ?? curWordRef.current), [_speak])
  const pause  = useCallback(() => { synthesis.pause();  setSpeechState('paused')  }, [])
  const resume = useCallback(() => { synthesis.resume(); setSpeechState('playing') }, [])

  const stop = useCallback(() => {
    synthesis.cancel()
    setSpeechState('idle')
    setCurrentWordIdx(-1)
    curWordRef.current = 0
  }, [])

  const skip = useCallback((delta) => {
    const next = Math.max(0, Math.min(wordsRef.current.length - 1, curWordRef.current + delta))
    if (speechState === 'playing') _speak(next)
    else { curWordRef.current = next; setCurrentWordIdx(next) }
  }, [speechState, _speak])

  const seekTo = useCallback((ratio) => {
    const total = wordsRef.current.length
    const idx = Math.round(ratio * Math.max(0, total - 1))
    if (speechState === 'playing') _speak(idx)
    else { curWordRef.current = idx; setCurrentWordIdx(idx) }
  }, [speechState, _speak])

  const changeVoice = useCallback((voice) => {
    setSelectedVoice(voice)
    if (speechState === 'playing') _speak(curWordRef.current, voice, null)
  }, [speechState, _speak])

  const changeRate = useCallback((r) => {
    setRate(r)
    if (speechState === 'playing') _speak(curWordRef.current, null, r)
  }, [speechState, _speak])

  /* ── Keyboard shortcuts ──────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
      if (e.code === 'Space')     { e.preventDefault(); speechState === 'playing' ? pause() : speechState === 'paused' ? resume() : play() }
      if (e.code === 'Escape')    stop()
      if (e.code === 'ArrowRight' && e.altKey) skip(+50)
      if (e.code === 'ArrowLeft'  && e.altKey) skip(-50)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [speechState, play, pause, resume, stop, skip])

  return {
    speechState, voices, selectedVoice, rate, currentWordIdx,
    loadText, play, pause, resume, stop, skip, seekTo,
    setVoice: changeVoice, setRate: changeRate,
  }
}
