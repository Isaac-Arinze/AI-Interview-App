/**
 * Server-side signals used when TRUST_SERVER_STT=1 (until a real STT service is wired).
 * Produces a conservative confidence in [0.2, 0.95] from transcript length and speaking duration.
 */

/**
 * @param {{ transcript?: string, duration_seconds?: number, client_confidence?: number }} input
 * @returns {{ confidence: number, source: 'server_heuristic' }}
 */
function deriveConfidenceFromSignals(input) {
  const transcript = (input.transcript || '').trim();
  const duration = Math.max(0, parseFloat(input.duration_seconds) || 0);
  const words = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;

  let c = 0.52;
  if (words >= 8) c += 0.12;
  if (words >= 18) c += 0.1;
  if (words >= 40) c += 0.06;
  if (duration >= 8 && duration <= 180) c += 0.1;
  if (duration >= 20) c += 0.04;
  if (duration > 0 && duration < 4) c = Math.min(c, 0.38);
  if (words < 3) c = Math.min(c, 0.4);

  const confidence = Math.min(0.95, Math.max(0.2, c));
  return { confidence, source: 'server_heuristic' };
}

module.exports = {
  deriveConfidenceFromSignals
};
