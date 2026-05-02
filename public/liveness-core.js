/**
 * Shared liveness decision logic (browser + Node/Jest via UMD).
 * Pose steps assume video is sampled with horizontal mirror so "user's right"
 * corresponds to increasing normalized centroid x (0 = left, 1 = right).
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

  /** Minimum horizontal centroid travel (0–1 scale) for a turn step */
  const POSE_TURN_DELTA = 0.048;
  /** Must show some spread in centroid samples (anti-static) */
  const POSE_MIN_RANGE = 0.038;

  function stddevSample(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, x) => s + (x - mean) * (x - mean), 0) / arr.length);
  }

  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  /**
   * Brightness-weighted horizontal centroid (normalized 0–1).
   * Works on RGBA ImageData from a small downscaled canvas.
   */
  function centroidXNormalizedFromImageData(imageData, w, h) {
    const { data } = imageData;
    const px = w * h;
    let mean = 0;
    for (let i = 0; i < data.length; i += 4) {
      mean += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    mean /= px;
    const thresh = mean * 0.88;
    let sumL = 0;
    let sumX = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const g = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (g > thresh) {
          sumL += g;
          sumX += g * x;
        }
      }
    }
    if (sumL < 1e-6) return 0.5;
    return sumX / sumL / w;
  }

  /**
   * @param {number[]} cxSamples - centroid x in [0,1] over time (mirrored video)
   * @param {'right'|'left'|'straight'} direction
   */
  function poseDecisionFromCxSeries(cxSamples, direction) {
    if (!cxSamples || cxSamples.length < 6) return false;
    const n = cxSamples.length;
    const headLen = Math.max(3, Math.min(5, Math.floor(n / 3)));
    const first = median(cxSamples.slice(0, headLen));
    const last = median(cxSamples.slice(-headLen));
    const delta = last - first;
    let min = cxSamples[0];
    let max = cxSamples[0];
    for (let i = 1; i < cxSamples.length; i++) {
      if (cxSamples[i] < min) min = cxSamples[i];
      if (cxSamples[i] > max) max = cxSamples[i];
    }
    const range = max - min;
    if (range < POSE_MIN_RANGE) return false;

    if (direction === 'right') {
      return delta > POSE_TURN_DELTA;
    }
    if (direction === 'left') {
      return delta < -POSE_TURN_DELTA;
    }
    if (direction === 'straight') {
      const tail = cxSamples.slice(-Math.min(10, n));
      const m = median(tail);
      const steady = stddevSample(tail) < 0.042;
      return Math.abs(m - 0.5) < 0.2 && steady;
    }
    return false;
  }

  /**
   * @param {number[]} diffs - per-interval mean RGB delta norms
   */
  function motionPassFromDiffNorms(diffs) {
    let spikes = 0;
    for (let i = 0; i < diffs.length; i++) {
      if (diffs[i] > MOTION_SPIKE_THRESHOLD) spikes++;
    }
    const sigma = stddevSample(diffs);
    return spikes >= MOTION_MIN_SPIKES || sigma >= MOTION_SIGMA_PASS;
  }

  /** Relaxed gate for pose windows (small head turns). */
  function motionLiveEnoughForPose(diffs) {
    if (!diffs || !diffs.length) return false;
    if (motionPassFromDiffNorms(diffs)) return true;
    let max = diffs[0];
    for (let i = 1; i < diffs.length; i++) {
      if (diffs[i] > max) max = diffs[i];
    }
    return max > 2.0;
  }

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
    median,
    centroidXNormalizedFromImageData,
    poseDecisionFromCxSeries,
    motionPassFromDiffNorms,
    motionLiveEnoughForPose,
    verifyLivenessPhraseText,
    MOTION_SPIKE_THRESHOLD,
    MOTION_MIN_SPIKES,
    MOTION_SIGMA_PASS,
    POSE_TURN_DELTA,
    POSE_MIN_RANGE
  };
});
