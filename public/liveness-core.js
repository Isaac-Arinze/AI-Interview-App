/**
 * Shared liveness decision logic (browser + Node/Jest via UMD).
 * Keep thresholds in sync with LIVENESS_ALGORITHM comments in index.html.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LivenessCore = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const LIVENESS_STORAGE_KEY = 'aria_liveness_passed_v1';
  const LIVENESS_PHRASE_BANK = [
    'blue river',
    'quiet storm',
    'bright morning',
    'swift arrow',
    'calm ocean',
    'golden field',
    'silver cloud',
    'gentle wind'
  ];

  const MOTION_SPIKE_THRESHOLD = 3.2;
  const MOTION_MIN_SPIKES = 3;
  const MOTION_SIGMA_PASS = 0.85;

  function stddevSample(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, x) => s + (x - mean) * (x - mean), 0) / arr.length);
  }

  /**
   * @param {number[]} diffs - per-interval mean RGB delta norms (same formula as runLivenessMotionCheck)
   */
  function motionPassFromDiffNorms(diffs) {
    let spikes = 0;
    for (let i = 0; i < diffs.length; i++) {
      if (diffs[i] > MOTION_SPIKE_THRESHOLD) spikes++;
    }
    const sigma = stddevSample(diffs);
    return spikes >= MOTION_MIN_SPIKES || sigma >= MOTION_SIGMA_PASS;
  }

  /**
   * @param {string} challengePhrase - two-word phrase from bank
   * @param {string} spokenOrTyped - user input or STT transcript
   */
  function verifyLivenessPhraseText(challengePhrase, spokenOrTyped) {
    const words = (challengePhrase || '').toLowerCase().match(/[a-z]+/g) || [];
    if (words.length < 2) return false;
    const t = (spokenOrTyped || '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return words.every((w) => t.includes(w));
  }

  return {
    LIVENESS_STORAGE_KEY,
    LIVENESS_PHRASE_BANK,
    stddevSample,
    motionPassFromDiffNorms,
    verifyLivenessPhraseText,
    MOTION_SPIKE_THRESHOLD,
    MOTION_MIN_SPIKES,
    MOTION_SIGMA_PASS
  };
});
