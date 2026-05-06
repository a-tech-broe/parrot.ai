'use strict';

class ParrotApp {
  constructor() {
    this.state = 'idle'; // idle | loading | ready | playing | paused
    this.text = '';
    this.words = [];          // { text, charStart, charEnd, index }
    this.currentWord = 0;
    this.charOffset = 0;      // char index of where current utterance begins
    this.utterance = null;
    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.rate = 1.0;
    this.selectedVoice = null;
    this.timerHandle = null;
    this.timerStart = 0;
    this.timerBase = 0;       // accumulated ms before current play segment

    this.el = {
      uploadView:     document.getElementById('upload-view'),
      readerView:     document.getElementById('reader-view'),
      dropZone:       document.getElementById('drop-zone'),
      fileInput:      document.getElementById('file-input'),
      btnBrowse:      document.getElementById('btn-browse'),
      loadingOverlay: document.getElementById('loading-overlay'),
      toast:          document.getElementById('toast'),
      toastMsg:       document.getElementById('toast-msg'),
      docName:        document.getElementById('doc-name'),
      docMeta:        document.getElementById('doc-meta'),
      textDisplay:    document.getElementById('text-display'),
      btnPlay:        document.getElementById('btn-play'),
      playIcon:       document.getElementById('play-icon'),
      btnStop:        document.getElementById('btn-stop'),
      btnSkipBack:    document.getElementById('btn-skip-back'),
      btnSkipFwd:     document.getElementById('btn-skip-fwd'),
      btnNewDoc:      document.getElementById('btn-new-doc'),
      voiceSelect:    document.getElementById('voice-select'),
      speedSlider:    document.getElementById('speed-slider'),
      speedVal:       document.getElementById('speed-val'),
      progressTrack:  document.getElementById('progress-track'),
      progressFill:   document.getElementById('progress-fill'),
      progressThumb:  document.getElementById('progress-thumb'),
      timeElapsed:    document.getElementById('time-elapsed'),
      timeTotal:      document.getElementById('time-total'),
    };

    this._loadVoices();
    if ('onvoiceschanged' in this.synthesis) {
      this.synthesis.onvoiceschanged = () => this._loadVoices();
    }

    this._bindEvents();
  }

  /* ── Voice loading ──────────────────────────────────── */

  _loadVoices() {
    const all = this.synthesis.getVoices();
    this.voices = all.filter(v => v.lang.startsWith('en'));
    if (!this.voices.length) this.voices = all;

    const sel = this.el.voiceSelect;
    const prevVal = sel.value;
    sel.innerHTML = '';

    this.voices.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.default) opt.selected = true;
      sel.appendChild(opt);
    });

    // Restore previous selection if possible
    if (prevVal && sel.querySelector(`[value="${prevVal}"]`)) sel.value = prevVal;
    this.selectedVoice = this.voices[sel.value] || this.voices[0] || null;
  }

  /* ── Event binding ──────────────────────────────────── */

  _bindEvents() {
    const { dropZone, fileInput, btnBrowse, btnPlay, btnStop,
            btnSkipBack, btnSkipFwd, btnNewDoc, voiceSelect,
            speedSlider, progressTrack } = this.el;

    btnBrowse.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
      if (e.target.files[0]) this._handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) this._handleFile(e.dataTransfer.files[0]);
    });

    btnPlay.addEventListener('click',     () => this._togglePlay());
    btnStop.addEventListener('click',     () => this._stop());
    btnSkipBack.addEventListener('click', () => this._skip(-50));
    btnSkipFwd.addEventListener('click',  () => this._skip(+50));
    btnNewDoc.addEventListener('click',   () => this._newDocument());

    voiceSelect.addEventListener('change', e => {
      this.selectedVoice = this.voices[e.target.value] || null;
      if (this.state === 'playing') { this._stop(); this._play(); }
    });

    speedSlider.addEventListener('input', e => {
      this.rate = parseFloat(e.target.value);
      this.el.speedVal.textContent = `${this.rate.toFixed(1)}×`;
      this._updateTotalTime();
      if (this.utterance) this.utterance.rate = this.rate;
    });

    progressTrack.addEventListener('click', e => {
      const r = e.target.getBoundingClientRect();
      this._seekToRatio((e.clientX - r.left) / r.width);
    });

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space')      { e.preventDefault(); this._togglePlay(); }
      if (e.code === 'Escape')     this._stop();
      if (e.code === 'ArrowRight' && e.altKey) this._skip(+50);
      if (e.code === 'ArrowLeft'  && e.altKey) this._skip(-50);
    });
  }

  /* ── File handling ──────────────────────────────────── */

  async _handleFile(file) {
    this._setLoading(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/parse', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to parse document.');
      this._loadDocument(data);
    } catch (err) {
      this._showError(err.message);
    } finally {
      this._setLoading(false);
    }
  }

  _loadDocument(data) {
    this.text = data.text;
    this.words = this._buildWordIndex(data.text);
    this.currentWord = 0;
    this.charOffset = 0;
    this.timerBase = 0;

    this.el.docName.textContent = data.filename;
    this.el.docMeta.textContent = `${data.word_count.toLocaleString()} words`;
    this._renderText();
    this._updateTotalTime();
    this._updateProgress(0);
    this.el.timeElapsed.textContent = '0:00';

    this._showView('reader');
    this.state = 'ready';
    this._syncPlayButton();
  }

  /* ── Word index ─────────────────────────────────────── */

  _buildWordIndex(text) {
    const words = [];
    let i = 0;
    while (i < text.length) {
      // Skip whitespace
      while (i < text.length && /\s/.test(text[i])) i++;
      if (i >= text.length) break;
      const start = i;
      while (i < text.length && /\S/.test(text[i])) i++;
      words.push({ charStart: start, charEnd: i, index: words.length });
    }
    return words;
  }

  /* ── Text rendering ─────────────────────────────────── */

  _renderText() {
    const container = this.el.textDisplay;
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    let cursor = 0;

    for (const word of this.words) {
      if (word.charStart > cursor) {
        frag.appendChild(document.createTextNode(this.text.slice(cursor, word.charStart)));
      }
      const span = document.createElement('span');
      span.className = 'word';
      span.dataset.idx = word.index;
      span.textContent = this.text.slice(word.charStart, word.charEnd);
      frag.appendChild(span);
      cursor = word.charEnd;
    }

    if (cursor < this.text.length) {
      frag.appendChild(document.createTextNode(this.text.slice(cursor)));
    }

    container.appendChild(frag);
  }

  /* ── Playback ───────────────────────────────────────── */

  _play(fromWord = null) {
    if (fromWord !== null) this.currentWord = Math.max(0, Math.min(fromWord, this.words.length - 1));

    this.synthesis.cancel();

    const startChar = this.words[this.currentWord]?.charStart ?? 0;
    this.charOffset = startChar;
    const slice = this.text.slice(startChar);

    this.utterance = new SpeechSynthesisUtterance(slice);
    if (this.selectedVoice) this.utterance.voice = this.selectedVoice;
    this.utterance.rate = this.rate;
    this.utterance.pitch = 1;

    this.utterance.onboundary = e => {
      if (e.name !== 'word') return;
      this._highlightByChar(this.charOffset + e.charIndex);
    };

    this.utterance.onend = () => {
      if (this.state !== 'playing') return;
      this.state = 'ready';
      this.currentWord = 0;
      this._clearHighlight();
      this._syncPlayButton();
      this._stopTimer();
      this._updateProgress(0);
      this.el.timeElapsed.textContent = '0:00';
    };

    this.utterance.onerror = e => {
      if (e.error === 'interrupted') return;
      this.state = 'ready';
      this._syncPlayButton();
      this._stopTimer();
    };

    this.synthesis.speak(this.utterance);
    this.state = 'playing';
    this._syncPlayButton();
    this._startTimer();
  }

  _pause() {
    this.synthesis.pause();
    this.state = 'paused';
    this._syncPlayButton();
    this._stopTimer();
  }

  _resume() {
    this.synthesis.resume();
    this.state = 'playing';
    this._syncPlayButton();
    this._startTimer();
  }

  _stop() {
    this.synthesis.cancel();
    this.state = 'ready';
    this.currentWord = 0;
    this.timerBase = 0;
    this._clearHighlight();
    this._syncPlayButton();
    this._stopTimer();
    this._updateProgress(0);
    this.el.timeElapsed.textContent = '0:00';
  }

  _togglePlay() {
    if (this.state === 'idle' || this.state === 'loading') return;
    if (this.state === 'playing') this._pause();
    else if (this.state === 'paused') this._resume();
    else this._play();
  }

  _skip(delta) {
    const next = Math.max(0, Math.min(this.words.length - 1, this.currentWord + delta));
    if (this.state === 'playing') {
      this.timerBase += Date.now() - this.timerStart;
      this._play(next);
    } else {
      this.currentWord = next;
      this._highlightWord(next);
    }
  }

  _seekToRatio(ratio) {
    const idx = Math.round(ratio * (this.words.length - 1));
    const clampedRatio = idx / Math.max(1, this.words.length - 1);
    if (this.state === 'playing') {
      this.timerBase = clampedRatio * this._totalSeconds() * 1000;
      this._play(idx);
    } else {
      this.currentWord = idx;
      this._highlightWord(idx);
      this._updateProgress(clampedRatio);
      this.el.timeElapsed.textContent = this._fmt(clampedRatio * this._totalSeconds());
    }
  }

  /* ── Highlighting ───────────────────────────────────── */

  _highlightByChar(absChar) {
    // Binary search
    let lo = 0, hi = this.words.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const w = this.words[mid];
      if (absChar < w.charStart)      hi = mid - 1;
      else if (absChar >= w.charEnd)  lo = mid + 1;
      else { this._highlightWord(mid); return; }
    }
    if (lo < this.words.length) this._highlightWord(lo);
  }

  _highlightWord(idx) {
    this._clearHighlight();
    this.currentWord = idx;

    const span = this.el.textDisplay.querySelector(`[data-idx="${idx}"]`);
    if (span) {
      span.classList.add('active');
      span.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }

    const ratio = idx / Math.max(1, this.words.length - 1);
    this._updateProgress(ratio);
  }

  _clearHighlight() {
    const active = this.el.textDisplay.querySelector('.word.active');
    if (active) active.classList.remove('active');
  }

  /* ── Progress & timer ───────────────────────────────── */

  _updateProgress(ratio) {
    const pct = `${(ratio * 100).toFixed(1)}%`;
    this.el.progressFill.style.width = pct;
    this.el.progressThumb.style.left = pct;
  }

  _totalSeconds() {
    return (this.words.length / 150) * 60 / this.rate;
  }

  _updateTotalTime() {
    this.el.timeTotal.textContent = this._fmt(this._totalSeconds());
  }

  _startTimer() {
    this.timerStart = Date.now();
    this.timerHandle = setInterval(() => {
      const elapsed = this.timerBase + (Date.now() - this.timerStart);
      this.el.timeElapsed.textContent = this._fmt(elapsed / 1000);
    }, 500);
  }

  _stopTimer() {
    clearInterval(this.timerHandle);
    if (this.state !== 'ready') {
      this.timerBase += Date.now() - this.timerStart;
    }
  }

  _fmt(secs) {
    const s = Math.max(0, secs);
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  /* ── UI helpers ─────────────────────────────────────── */

  _syncPlayButton() {
    const playing = this.state === 'playing';
    const icon = this.el.playIcon;

    if (playing) {
      icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      this.el.btnPlay.title = 'Pause (Space)';
    } else {
      icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      this.el.btnPlay.title = 'Play (Space)';
    }
    this.el.btnPlay.classList.toggle('playing', playing);
  }

  _showView(name) {
    this.el.uploadView.classList.toggle('active', name === 'upload');
    this.el.readerView.classList.toggle('active', name === 'reader');
  }

  _newDocument() {
    this._stop();
    this.text = '';
    this.words = [];
    this.el.textDisplay.innerHTML = '';
    this.el.fileInput.value = '';
    this.state = 'idle';
    this._showView('upload');
  }

  _setLoading(on) {
    this.el.loadingOverlay.hidden = !on;
    if (on) this.state = 'loading';
  }

  _showError(msg) {
    const { toast, toastMsg } = this.el;
    toastMsg.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.hidden = true; }, 300);
    }, 5000);
  }
}

document.addEventListener('DOMContentLoaded', () => new ParrotApp());
