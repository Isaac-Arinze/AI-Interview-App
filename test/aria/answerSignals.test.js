const { deriveConfidenceFromSignals } = require('../../src/aria/answerSignals');

describe('deriveConfidenceFromSignals', () => {
  it('raises confidence for longer answers and reasonable duration', () => {
    const t = 'word '.repeat(25).trim();
    const { confidence } = deriveConfidenceFromSignals({
      transcript: t,
      duration_seconds: 25
    });
    expect(confidence).toBeGreaterThan(0.7);
    expect(confidence).toBeLessThanOrEqual(0.95);
  });

  it('lowers confidence for very short duration', () => {
    const { confidence } = deriveConfidenceFromSignals({
      transcript: 'one two three four five six seven eight',
      duration_seconds: 2
    });
    expect(confidence).toBeLessThan(0.55);
  });

  it('marks source as server_heuristic', () => {
    const r = deriveConfidenceFromSignals({ transcript: 'a b c d e f g h', duration_seconds: 12 });
    expect(r.source).toBe('server_heuristic');
  });
});
