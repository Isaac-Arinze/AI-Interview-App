/**
 * Stage-7 placeholder for async LLM / HR narrative reports.
 * Deterministic stub derived only from existing session + scoring (no external AI).
 */

/**
 * @param {object} session — ARIASession instance
 * @param {object} scoring — result of Evaluator.scoreSession
 * @returns {object}
 */
function buildInterviewReportStub(session, scoring) {
  const avg = typeof scoring.avg_score === 'number' ? scoring.avg_score : 0;
  const n = scoring.total_questions || 0;
  const dims = scoring.dimension_averages || {};

  let recommendation = 'consider';
  if (avg >= 82) recommendation = 'strong_hire';
  else if (avg >= 70) recommendation = 'hire';
  else if (avg < 45) recommendation = 'reject';

  const strengths = [];
  const gaps = [];
  if ((dims.communication || 0) >= 18) strengths.push('Communication dimension looks solid for this run.');
  if ((dims.relevance || 0) >= 18) strengths.push('Answers stayed relevant to the prompts.');
  if ((dims.depth || 0) < 12) gaps.push('Depth scores suggest asking more follow-up examples in a live panel.');
  if ((dims.structure || 0) < 12) gaps.push('Structure scores suggest coaching on STAR-style responses.');
  if (n < 2) gaps.push('Very few scored answers — treat this summary as directional only.');

  return {
    status: 'stub_v1',
    version: 1,
    generated_at: new Date().toISOString(),
    recommendation,
    strengths,
    gaps,
    narrative: `Heuristic overview: average ${avg.toFixed(1)} / 100 across ${n} scored answer(s). Replace stub with LLM output when wired.`
  };
}

module.exports = {
  buildInterviewReportStub
};
