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
