/**
 * Central feature flags and env-backed config (staged rollout).
 * Defaults preserve current single-process, in-memory behavior.
 */
function readConfig() {
  return {
    /**
     * When true: sessions are written to JSON files under `data/sessions/`
     * (survives server restarts). Swap for PostgreSQL later; env name kept as USE_DB for staging plans.
     */
    useDb: process.env.USE_DB === '1' || process.env.USE_DB === 'true',
    /**
     * When true: each scored answer drops a JSON job file under `data/jobs/`.
     * Run `npm run worker` to drain into `data/jobs/processed/` (stub logger until Redis/LLM).
     */
    useQueue: process.env.USE_QUEUE === '1' || process.env.USE_QUEUE === 'true',
    /**
     * When true: low-scoring phase-2 (behavioural) answers splice one `behavioural-followup` question ahead.
     */
    adaptiveFollowups:
      process.env.ADAPTIVE_FOLLOWUPS === '1' || process.env.ADAPTIVE_FOLLOWUPS === 'true',
    /**
     * When true: submit-answer derives confidence from transcript + duration on the server
     * (ignores client-sent confidence for evaluation). When OPENAI_API_KEY is set and the client
     * sends answer_audio_base64, the transcript is replaced with Whisper output before evaluation.
     */
    trustServerStt:
      process.env.TRUST_SERVER_STT === '1' || process.env.TRUST_SERVER_STT === 'true'
  };
}

module.exports = {
  readConfig
};
