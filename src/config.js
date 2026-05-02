/**
 * Central feature flags and env-backed config (staged rollout).
 * Defaults preserve current single-process, in-memory behavior.
 */
function readConfig() {
  return {
    /** Future: persist sessions to DB when true */
    useDb: process.env.USE_DB === '1' || process.env.USE_DB === 'true',
    /** Future: enqueue post-answer / post-interview jobs */
    useQueue: process.env.USE_QUEUE === '1' || process.env.USE_QUEUE === 'true',
    /** Future: adaptive follow-up splice in question list */
    adaptiveFollowups:
      process.env.ADAPTIVE_FOLLOWUPS === '1' || process.env.ADAPTIVE_FOLLOWUPS === 'true'
  };
}

module.exports = {
  readConfig
};
