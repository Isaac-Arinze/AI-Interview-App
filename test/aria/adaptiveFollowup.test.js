const { maybeInsertAdaptiveFollowup } = require('../../src/aria/adaptiveFollowup');
const ARIASession = require('../../src/aria/session');

function makeSession() {
  const s = new ARIASession(null, { name: 'T', role: 'Engineer' });
  s.questions = [
    { question_index: 0, text: 'Warm', phase: 1, type: 'warmup', expected_duration_range: [20, 60] },
    { question_index: 1, text: 'Tell me about conflict', phase: 2, type: 'behavioural', expected_duration_range: [30, 90] },
    { question_index: 2, text: 'Next situational', phase: 3, type: 'situational', expected_duration_range: [30, 90] }
  ];
  s.question_index = 1;
  return s;
}

describe('maybeInsertAdaptiveFollowup', () => {
  it('does nothing when disabled', () => {
    const session = makeSession();
    const questions = session.questions.slice();
    const evaluation = { total: 20, relevance: 5, depth: 5, structure: 5, communication: 5 };
    const current = questions[1];
    const { inserted } = maybeInsertAdaptiveFollowup({
      session,
      questions,
      evaluation,
      currentQuestion: current,
      enabled: false
    });
    expect(inserted).toBe(false);
    expect(questions.length).toBe(3);
  });

  it('inserts follow-up after weak phase-2 answer when enabled', () => {
    const session = makeSession();
    const questions = session.questions;
    const evaluation = { total: 35, relevance: 8, depth: 8, structure: 10, communication: 9 };
    const current = questions[1];
    const { inserted } = maybeInsertAdaptiveFollowup({
      session,
      questions,
      evaluation,
      currentQuestion: current,
      enabled: true
    });
    expect(inserted).toBe(true);
    expect(questions.length).toBe(4);
    expect(questions[2].type).toBe('behavioural-followup');
    expect(questions[2].text.length).toBeGreaterThan(10);
    expect(questions[2].question_index).toBe(2);
    expect(questions[3].question_index).toBe(3);
    expect(session.adaptive_followups_used).toBe(1);
  });

  it('does not insert on retry flags', () => {
    const session = makeSession();
    const questions = session.questions;
    const evaluation = { total: null, flag: 'LOW_CONFIDENCE' };
    const current = questions[1];
    const { inserted } = maybeInsertAdaptiveFollowup({
      session,
      questions,
      evaluation,
      currentQuestion: current,
      enabled: true
    });
    expect(inserted).toBe(false);
  });

  it('does not chain from a follow-up question', () => {
    const session = makeSession();
    session.questions.splice(2, 0, {
      question_index: 2,
      text: 'Follow?',
      phase: 2,
      type: 'behavioural-followup',
      expected_duration_range: [30, 90]
    });
    session.questions.forEach((q, i) => {
      q.question_index = i;
    });
    session.question_index = 2;
    const questions = session.questions;
    const current = questions[2];
    const evaluation = { total: 30, relevance: 6, depth: 6, structure: 8, communication: 10 };
    const { inserted } = maybeInsertAdaptiveFollowup({
      session,
      questions,
      evaluation,
      currentQuestion: current,
      enabled: true
    });
    expect(inserted).toBe(false);
  });
});
