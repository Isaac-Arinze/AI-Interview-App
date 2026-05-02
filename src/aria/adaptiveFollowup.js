const Evaluator = require('./evaluator');

const MAX_ADAPTIVE_PER_SESSION = 4;

/**
 * Renumber `question_index` on each element to match array position.
 * @param {Array<{ question_index?: number }>} questions
 */
function renumberQuestions(questions) {
  if (!Array.isArray(questions)) return;
  questions.forEach((q, i) => {
    q.question_index = i;
  });
}

/**
 * When ADAPTIVE_FOLLOWUPS is enabled, insert one behavioural follow-up after a weak phase-2 answer.
 *
 * @param {object} opts
 * @param {import('./session')} opts.session
 * @param {Array<object>} opts.questions — mutated in place
 * @param {object} opts.evaluation — from evaluateAnswer
 * @param {object|null} opts.currentQuestion
 * @param {boolean} opts.enabled
 * @returns {{ inserted: boolean }}
 */
function maybeInsertAdaptiveFollowup(opts) {
  const { session, questions, evaluation, currentQuestion, enabled } = opts;
  if (!enabled || !Array.isArray(questions) || !currentQuestion) {
    return { inserted: false };
  }

  if (currentQuestion.type === 'behavioural-followup') {
    return { inserted: false };
  }

  if (evaluation.flag && ['LOW_CONFIDENCE', 'ANSWER_TOO_SHORT'].includes(evaluation.flag)) {
    return { inserted: false };
  }

  const total = evaluation.total;
  if (total == null || !Evaluator.shouldFollowUp(total, currentQuestion.phase)) {
    return { inserted: false };
  }

  const used = session.adaptive_followups_used || 0;
  if (used >= MAX_ADAPTIVE_PER_SESSION) {
    return { inserted: false };
  }

  const insertAt = session.question_index + 1;
  if (insertAt < questions.length) {
    const nextQ = questions[insertAt];
    if (nextQ && nextQ.type === 'behavioural-followup') {
      return { inserted: false };
    }
  }

  const text = Evaluator.generateFollowUp({
    originalText: currentQuestion.text,
    role: session.candidate && session.candidate.role
  });

  const follow = {
    question_index: insertAt,
    text,
    phase: currentQuestion.phase,
    type: 'behavioural-followup',
    expected_duration_range: [30, 90]
  };

  questions.splice(insertAt, 0, follow);
  session.adaptive_followups_used = used + 1;
  renumberQuestions(questions);
  session.questions = questions;

  return { inserted: true };
}

module.exports = {
  maybeInsertAdaptiveFollowup,
  renumberQuestions,
  MAX_ADAPTIVE_PER_SESSION
};
