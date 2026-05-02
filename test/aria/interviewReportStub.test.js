const { buildInterviewReportStub } = require('../../src/aria/interviewReportStub');
const ARIASession = require('../../src/aria/session');

describe('buildInterviewReportStub', () => {
  it('returns stub_v1 with recommendation from avg score', () => {
    const session = new ARIASession(null, { name: 'A', role: 'Engineer' });
    const scoring = {
      total_questions: 3,
      avg_score: 72,
      avg_duration: 30,
      dimension_averages: {
        relevance: 18,
        depth: 16,
        structure: 20,
        communication: 19
      }
    };
    const r = buildInterviewReportStub(session, scoring);
    expect(r.status).toBe('stub_v1');
    expect(r.version).toBe(1);
    expect(r.recommendation).toBe('hire');
    expect(r.generated_at).toMatch(/^\d{4}-/);
    expect(r.narrative).toContain('72');
    expect(Array.isArray(r.strengths)).toBe(true);
    expect(Array.isArray(r.gaps)).toBe(true);
  });

  it('maps high scores to strong_hire', () => {
    const session = new ARIASession(null, { name: 'C', role: 'Eng' });
    const scoring = {
      total_questions: 4,
      avg_score: 88,
      dimension_averages: { relevance: 22, depth: 22, structure: 22, communication: 22 }
    };
    const r = buildInterviewReportStub(session, scoring);
    expect(r.recommendation).toBe('strong_hire');
  });

  it('maps low scores to reject', () => {
    const session = new ARIASession(null, { name: 'B', role: 'PM' });
    const scoring = {
      total_questions: 2,
      avg_score: 40,
      dimension_averages: { relevance: 8, depth: 8, structure: 8, communication: 10 }
    };
    const r = buildInterviewReportStub(session, scoring);
    expect(r.recommendation).toBe('reject');
    expect(r.gaps.length).toBeGreaterThan(0);
  });
});
