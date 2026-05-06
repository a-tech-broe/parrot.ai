// Mock Web Speech API — not available in jsdom
global.speechSynthesis = {
  getVoices: () => [],
  speak: () => {},
  cancel: () => {},
  pause: () => {},
  resume: () => {},
  onvoiceschanged: null,
}

global.SpeechSynthesisUtterance = class {
  constructor(text) { this.text = text }
}
