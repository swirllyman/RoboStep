// voice.js - Kid-Friendly Speech Synthesis Engine & Voice Customizer

class VoiceEngine {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.voices = [];
    this.ready = false;

    // Default settings optimized for a cute, bright, kid-friendly robot voice
    this.defaultSettings = {
      enabled: true,
      voiceURI: "",
      pitch: 1.45,       // High pitched, cute cartoon/robot tone (range: 0.5 - 2.0)
      rate: 1.10,        // Cheerful, upbeat cadence (range: 0.5 - 1.8)
      volume: 1.0,       // Full volume
      mode: "both",      // "both" (1: Up!), "numbers" (One, Two...), "directions" (Up, Right...)
      speakButtons: true, // Announce button taps (Up, Down, Run, Reset...)
      speakSteps: true,   // Call out steps during execution
      speakEvents: true,  // Reactions, celebrations, collisions, level titles
      speakTips: false    // Read tips aloud
    };

    this.settings = this.loadSettings();

    if (this.synth) {
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadSettings() {
    const saved = localStorage.getItem('robostep_voice_settings');
    if (saved) {
      try {
        return { ...this.defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        // Fallback
      }
    }
    return { ...this.defaultSettings };
  }

  saveSettings() {
    localStorage.setItem('robostep_voice_settings', JSON.stringify(this.settings));
  }

  resetToDefaults() {
    this.settings = { ...this.defaultSettings };
    // Try to auto-select best kid-friendly voice
    this.autoSelectFriendlyVoice();
    this.saveSettings();
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (this.voices.length > 0) {
      this.ready = true;
      if (!this.settings.voiceURI || !this.voices.some(v => v.voiceURI === this.settings.voiceURI)) {
        this.autoSelectFriendlyVoice();
      }
    }
  }

  autoSelectFriendlyVoice() {
    if (!this.voices || this.voices.length === 0) return;

    // Prefer English voices that sound natural or friendly (e.g. Google, Samantha, Zira, Victoria)
    const preferredNames = ["Google US English", "Samantha", "Victoria", "Karen", "Microsoft Zira", "Natural"];
    for (const name of preferredNames) {
      const match = this.voices.find(v => v.name.includes(name) && v.lang.startsWith("en"));
      if (match) {
        this.settings.voiceURI = match.voiceURI;
        return;
      }
    }

    // Otherwise pick the first English voice
    const enVoice = this.voices.find(v => v.lang.startsWith("en"));
    if (enVoice) {
      this.settings.voiceURI = enVoice.voiceURI;
    } else {
      this.settings.voiceURI = this.voices[0].voiceURI;
    }
  }

  getSelectedVoice() {
    if (!this.voices || this.voices.length === 0) return null;
    return this.voices.find(v => v.voiceURI === this.settings.voiceURI) || this.voices[0];
  }

  cancel() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  speak(text, options = {}) {
    if (!this.synth || !this.settings.enabled || !text) return;

    // Cancel current speech if requested (e.g. for responsive button taps)
    if (options.interrupt) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getSelectedVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.pitch = options.pitch !== undefined ? options.pitch : this.settings.pitch;
    utterance.rate = options.rate !== undefined ? options.rate : this.settings.rate;
    utterance.volume = options.volume !== undefined ? options.volume : this.settings.volume;

    this.synth.speak(utterance);
  }

  // Helper to pronounce numbers clearly (1 -> "One", 2 -> "Two", etc.)
  numberToWord(num) {
    const words = [
      "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"
    ];
    return words[num] || num.toString();
  }

  // Spoken feedback for execution step
  speakStep(stepNumber, direction) {
    if (!this.settings.speakSteps) return;

    const numWord = this.numberToWord(stepNumber);
    let phrase = "";

    if (this.settings.mode === "numbers") {
      phrase = numWord;
    } else if (this.settings.mode === "directions") {
      phrase = direction.toLowerCase();
    } else {
      // "both": e.g. "One, Up!" or "Two, Right!"
      phrase = `${numWord}! ${direction.toLowerCase()}!`;
    }

    this.speak(phrase, { interrupt: true });
  }

  // Spoken feedback for button tap
  speakButton(name) {
    if (!this.settings.speakButtons) return;
    this.speak(name, { interrupt: true });
  }

  // Spoken feedback for events (bump, win, fall)
  speakEvent(text) {
    if (!this.settings.speakEvents) return;
    this.speak(text, { interrupt: true });
  }

  speakRandom(phrases) {
    if (!this.settings.speakEvents || !phrases || phrases.length === 0) return;
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.speak(phrase, { interrupt: true });
  }

  // Test the current voice configuration
  testSample() {
    this.cancel();
    const testPhrases = [
      "Beep boop! I am your robot buddy! One, two, three, let's get the gem!",
      "Up, Up, Right, Down! Awesome counting!",
      "Super coder! You can do it!"
    ];
    const phrase = testPhrases[Math.floor(Math.random() * testPhrases.length)];
    this.speak(phrase, { interrupt: true });
  }
}

// Global Voice singleton
const Voice = new VoiceEngine();
