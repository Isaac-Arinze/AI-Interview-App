/**
 * Unit Tests for ARIA Session Manager
 */

const ARIASession = require('../../src/aria/session');

describe('ARIASession', () => {
  let session;

  beforeEach(() => {
    session = new ARIASession('test-session-123', {
      name: 'John Doe',
      role: 'Software Engineer',
      language: 'en-US'
    });
  });

  describe('Constructor', () => {
    test('should create session with correct properties', () => {
      expect(session.session_id).toBe('test-session-123');
      expect(session.candidate.name).toBe('John Doe');
      expect(session.candidate.role).toBe('Software Engineer');
      expect(session.state).toBe('IDLE');
      expect(session.question_index).toBe(0);
    });

    test('should generate UUID if no session_id provided', () => {
      const s = new ARIASession(null, { name: 'Jane' });
      expect(s.session_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    test('should set default candidate values', () => {
      const s = new ARIASession('test', {});
      expect(s.candidate.name).toBe('Candidate');
      expect(s.candidate.role).toBe('Unspecified');
      expect(s.candidate.language).toBe('en-US');
    });

    test('should initialize timestamp correctly', () => {
      expect(session.created_at).toBeDefined();
      expect(session.expires_at).toBeDefined();
      expect(new Date(session.expires_at) > new Date(session.created_at)).toBe(true);
    });
  });

  describe('State Transitions', () => {
    test('should transition from IDLE to GREETING', () => {
      session.transitionState('GREETING');
      expect(session.state).toBe('GREETING');
    });

    test('should throw error on invalid state', () => {
      expect(() => session.transitionState('INVALID_STATE')).toThrow(
        'Invalid state: INVALID_STATE'
      );
    });

    test('should enforce transition rules', () => {
      session.state = 'IDLE';
      expect(() => session.transitionState('CLOSING')).toThrow(
        'Invalid transition: IDLE → CLOSING'
      );
    });

    test('should allow valid transition sequence', () => {
      session.transitionState('GREETING');
      expect(session.state).toBe('GREETING');

      session.transitionState('QUESTION');
      expect(session.state).toBe('QUESTION');

      session.transitionState('LISTENING');
      expect(session.state).toBe('LISTENING');
    });

    test('should update last_activity on transition', () => {
      const before = new Date(session.last_activity).getTime();
      new Promise(r => setTimeout(r, 10)).then(() => {
        session.transitionState('GREETING');
        const after = new Date(session.last_activity).getTime();
        expect(after >= before).toBe(true);
      });
    });
  });

  describe('Answer Recording', () => {
    test('should record answer with all fields', () => {
      const answer = session.recordAnswer(
        'This is my answer',
        0.95,
        45.5,
        []
      );

      expect(answer.transcript).toBe('This is my answer');
      expect(answer.confidence).toBe(0.95);
      expect(answer.duration_seconds).toBe(45.5);
      expect(answer.question_index).toBe(0);
      expect(answer.scores.total).toBeNull();
    });

    test('should instantiate scores as null', () => {
      const answer = session.recordAnswer('answer', 0.8, 30);
      expect(answer.scores).toEqual({
        relevance: null,
        depth: null,
        structure: null,
        communication: null,
        total: null
      });
    });

    test('should coerce confidence to float', () => {
      const answer = session.recordAnswer('answer', '0.87', 30);
      expect(typeof answer.confidence).toBe('number');
      expect(answer.confidence).toBe(0.87);
    });

    test('should handle missing flags parameter', () => {
      const answer = session.recordAnswer('answer', 0.9, 30);
      expect(answer.flags).toEqual([]);
    });

    test('should append answers to session', () => {
      session.recordAnswer('answer1', 0.9, 30);
      session.recordAnswer('answer2', 0.85, 40);
      expect(session.answers.length).toBe(2);
    });
  });

  describe('Score Updates', () => {
    test('should update scores for last answer', () => {
      session.recordAnswer('answer', 0.9, 30);
      const scores = { relevance: 20, depth: 18, structure: 19, communication: 22 };
      const updated = session.updateLastAnswerScores(scores);

      expect(updated.scores.relevance).toBe(20);
      expect(updated.scores.depth).toBe(18);
      expect(updated.scores.structure).toBe(19);
      expect(updated.scores.communication).toBe(22);
      expect(updated.scores.total).toBe(79);
    });

    test('should calculate total score automatically', () => {
      session.recordAnswer('answer', 0.9, 30);
      session.updateLastAnswerScores({
        relevance: 25,
        depth: 25,
        structure: 25,
        communication: 25
      });

      expect(session.answers[0].scores.total).toBe(100);
    });

    test('should throw error if no answers exist', () => {
      expect(() =>
        session.updateLastAnswerScores({ relevance: 20 })
      ).toThrow('No answers to update');
    });

    test('should handle partial scores', () => {
      session.recordAnswer('answer', 0.9, 30);
      session.updateLastAnswerScores({ relevance: 15, depth: 12 });
      expect(session.answers[0].scores.total).toBe(27);
    });
  });

  describe('Question Navigation', () => {
    test('should increment question index', () => {
      expect(session.question_index).toBe(0);
      session.nextQuestion();
      expect(session.question_index).toBe(1);
    });

    test('should reset retry count on next question', () => {
      session.current_retry_count = 2;
      session.nextQuestion();
      expect(session.current_retry_count).toBe(0);
    });

    test('should clear transcript on next question', () => {
      session.current_transcript = 'old transcript';
      session.current_confidence = 0.9;
      session.nextQuestion();
      expect(session.current_transcript).toBeNull();
      expect(session.current_confidence).toBeNull();
    });
  });

  describe('Retry Management', () => {
    test('should increment retry count', () => {
      expect(session.current_retry_count).toBe(0);
      session.incrementRetry();
      expect(session.current_retry_count).toBe(1);
      session.incrementRetry();
      expect(session.current_retry_count).toBe(2);
    });

    test('should detect max retries exceeded', () => {
      session.current_retry_count = 1;
      expect(session.isMaxRetriesExceeded()).toBe(false);
      session.incrementRetry();
      expect(session.isMaxRetriesExceeded()).toBe(true);
    });

    test('should respect max_retries limit', () => {
      const maxRetries = 3;
      session.max_retries = maxRetries;
      for (let i = 0; i < maxRetries + 5; i++) {
        session.incrementRetry();
      }
      expect(session.current_retry_count).toBeGreaterThanOrEqual(maxRetries);
    });
  });

  describe('Session Expiration', () => {
    test('should check if session is expired', () => {
      expect(session.isExpired()).toBe(false);
      session.expires_at = new Date(Date.now() - 1000).toISOString();
      expect(session.isExpired()).toBe(true);
    });

    test('should extend TTL', () => {
      const before = new Date().getTime();
      session.extendTTL(3);
      const after = new Date().getTime();
      const newExpiry = new Date(session.expires_at).getTime();
      const timeDiff = newExpiry - after;
      // Should be approximately 3 minutes from now
      expect(timeDiff).toBeGreaterThan(2.5 * 60 * 1000);
      expect(timeDiff).toBeLessThan(3.5 * 60 * 1000);
    });

    test('should default to 5 minutes extension', () => {
      const before = new Date().getTime();
      session.extendTTL();
      const after = new Date().getTime();
      const expiry = new Date(session.expires_at).getTime();

      // Expiry should be ~5 min from now
      const timeDiff = expiry - after;
      expect(timeDiff).toBeGreaterThan(4 * 60 * 1000);
      expect(timeDiff).toBeLessThan(6 * 60 * 1000);
    });
  });

  describe('Session Summary', () => {
    test('should generate summary with no answers', () => {
      const summary = session.getSummary();
      expect(summary.total_questions).toBe(0);
      expect(summary.answered).toBe(0);
      expect(summary.skipped).toBe(0);
      expect(summary.overall_score).toBe(0);
    });

    test('should calculate summary with answers', () => {
      session.recordAnswer('answer1', 0.9, 30);
      session.updateLastAnswerScores({
        relevance: 20,
        depth: 18,
        structure: 19,
        communication: 22
      });

      session.question_index = 3;
      const summary = session.getSummary();

      expect(summary.total_questions).toBe(3);
      expect(summary.answered).toBe(1);
      expect(summary.skipped).toBe(2);
      expect(summary.overall_score).toBe(79);
    });

    test('should include per-question scores in summary', () => {
      session.recordAnswer('answer1', 0.9, 30);
      session.updateLastAnswerScores({
        relevance: 25,
        depth: 25,
        structure: 25,
        communication: 25
      });

      const summary = session.getSummary();
      expect(summary.per_question[0].scores.total).toBe(100);
      expect(summary.per_question[0].duration_seconds).toBe(30);
    });
  });

  describe('JSON Serialization', () => {
    test('should serialize to JSON', () => {
      session.recordAnswer('answer', 0.9, 30);
      const json = session.toJSON();

      expect(json.session_id).toBe(session.session_id);
      expect(json.state).toBe('IDLE');
      expect(json.answers.length).toBe(1);
      expect(json.candidate.name).toBe('John Doe');
    });

    test('should preserve all properties in JSON', () => {
      const json = session.toJSON();
      expect(json).toHaveProperty('session_id');
      expect(json).toHaveProperty('candidate');
      expect(json).toHaveProperty('state');
      expect(json).toHaveProperty('question_index');
      expect(json).toHaveProperty('phase');
      expect(json).toHaveProperty('answers');
      expect(json).toHaveProperty('created_at');
      expect(json).toHaveProperty('expires_at');
    });
  });
});
