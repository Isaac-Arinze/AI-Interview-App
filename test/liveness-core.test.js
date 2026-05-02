/**
 * Contract tests for liveness decision logic (shared with browser via public/liveness-core.js).
 */
const LivenessCore = require('../public/liveness-core.js');

describe('LivenessCore', () => {
  describe('stddevSample', () => {
    test('returns 0 for fewer than 2 samples', () => {
      expect(LivenessCore.stddevSample([])).toBe(0);
      expect(LivenessCore.stddevSample([1])).toBe(0);
    });

    test('computes population stddev for simple array', () => {
      const s = LivenessCore.stddevSample([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(s).toBeGreaterThan(1.9);
      expect(s).toBeLessThan(2.2);
    });
  });

  describe('poseDecisionFromCxSeries', () => {
    test('passes turn right when centroid shifts right (mirrored convention)', () => {
      const s = [0.48, 0.48, 0.5, 0.55, 0.58, 0.59, 0.6];
      expect(LivenessCore.poseDecisionFromCxSeries(s, 'right')).toBe(true);
    });

    test('passes turn left when centroid shifts left', () => {
      const s = [0.58, 0.57, 0.52, 0.46, 0.44, 0.43, 0.42];
      expect(LivenessCore.poseDecisionFromCxSeries(s, 'left')).toBe(true);
    });

    test('passes look straight when centered and steady', () => {
      const s = [0.44, 0.48, 0.5, 0.51, 0.5, 0.49, 0.5, 0.51];
      expect(LivenessCore.poseDecisionFromCxSeries(s, 'straight')).toBe(true);
    });

    test('fails right when range too small', () => {
      const s = [0.5, 0.501, 0.502, 0.501, 0.5, 0.501];
      expect(LivenessCore.poseDecisionFromCxSeries(s, 'right')).toBe(false);
    });
  });

  describe('centroidXNormalizedFromImageData', () => {
    test('leans toward brighter right side', () => {
      const w = 10;
      const h = 10;
      const data = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const v = x > 5 ? 250 : 20;
          data[i] = data[i + 1] = data[i + 2] = v;
          data[i + 3] = 255;
        }
      }
      const cx = LivenessCore.centroidXNormalizedFromImageData({ data }, w, h);
      expect(cx).toBeGreaterThan(0.55);
    });
  });

  describe('motionPassFromDiffNorms', () => {
    test('fails on empty or flat low motion', () => {
      expect(LivenessCore.motionPassFromDiffNorms([])).toBe(false);
      expect(LivenessCore.motionPassFromDiffNorms([0.1, 0.1, 0.1])).toBe(false);
    });

    test('passes when enough spike intervals (live movement pattern)', () => {
      const diffs = [4, 4, 4, 0.2, 0.2];
      expect(LivenessCore.motionPassFromDiffNorms(diffs)).toBe(true);
    });

    test('passes via high variance without three spikes', () => {
      const diffs = [0.5, 3.0, 0.5, 3.0, 0.5, 3.0, 0.5];
      expect(LivenessCore.motionPassFromDiffNorms(diffs)).toBe(true);
    });
  });

  describe('motionLiveEnoughForPose', () => {
    test('accepts moderate single spikes for small head motion', () => {
      expect(LivenessCore.motionLiveEnoughForPose([0.2, 2.2, 0.3])).toBe(true);
    });
  });

  describe('verifyLivenessPhraseText', () => {
    test('accepts both words in any order (case and punctuation tolerant)', () => {
      expect(LivenessCore.verifyLivenessPhraseText('blue river', 'River, Blue!')).toBe(true);
      expect(LivenessCore.verifyLivenessPhraseText('blue river', 'I said river then blue')).toBe(
        true
      );
    });

    test('rejects missing word', () => {
      expect(LivenessCore.verifyLivenessPhraseText('blue river', 'only blue here')).toBe(false);
    });

    test('rejects single-token challenge', () => {
      expect(LivenessCore.verifyLivenessPhraseText('hello', 'hello there')).toBe(false);
    });
  });

  describe('constants', () => {
    test('phrase bank has eight two-word phrases', () => {
      expect(LivenessCore.LIVENESS_PHRASE_BANK.length).toBe(8);
      LivenessCore.LIVENESS_PHRASE_BANK.forEach((p) => {
        expect(p.split(/\s+/).length).toBeGreaterThanOrEqual(2);
      });
    });

    test('storage key is stable', () => {
      expect(LivenessCore.LIVENESS_STORAGE_KEY).toBe('aria_liveness_passed_v1');
    });
  });
});
