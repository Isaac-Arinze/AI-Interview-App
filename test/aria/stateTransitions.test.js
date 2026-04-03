/**
 * Unit Tests for ARIA State Transitions
 */

const stateTransitions = require('../../src/aria/stateTransitions');
const ARIASession = require('../../src/aria/session');

describe('State Transitions', () => {
  let session;

  beforeEach(() => {
    session = new ARIASession('test-session', {
      name: 'John Doe',
      role: 'Software Engineer'
    });
  });

  describe('State Validation', () => {
    test('should validate correct states', () => {
      expect(stateTransitions.isValidState('IDLE')).toBe(true);
      expect(stateTransitions.isValidState('GREETING')).toBe(true);
      expect(stateTransitions.isValidState('QUESTION')).toBe(true);
      expect(stateTransitions.isValidState('LISTENING')).toBe(true);
      expect(stateTransitions.isValidState('EVALUATING')).toBe(true);
      expect(stateTransitions.isValidState('PROMPT_RETRY')).toBe(true);
      expect(stateTransitions.isValidState('CLOSING')).toBe(true);
    });

    test('should reject invalid states', () => {
      expect(stateTransitions.isValidState('INVALID')).toBe(false);
      expect(stateTransitions.isValidState('QUESTIONING')).toBe(false);
      expect(stateTransitions.isValidState('')).toBe(false);
      expect(stateTransitions.isValidState(null)).toBe(false);
    });
  });

  describe('Transition Validation', () => {
    test('should allow valid transitions', () => {
      expect(stateTransitions.isValidTransition('IDLE', 'GREETING')).toBe(true);
      expect(stateTransitions.isValidTransition('GREETING', 'QUESTION')).toBe(true);
      expect(stateTransitions.isValidTransition('QUESTION', 'LISTENING')).toBe(true);
      expect(stateTransitions.isValidTransition('LISTENING', 'EVALUATING')).toBe(true);
      expect(
        stateTransitions.isValidTransition('LISTENING', 'PROMPT_RETRY')
      ).toBe(true);
      expect(stateTransitions.isValidTransition('EVALUATING', 'QUESTION')).toBe(true);
      expect(stateTransitions.isValidTransition('EVALUATING', 'CLOSING')).toBe(true);
    });

    test('should reject invalid transitions', () => {
      expect(stateTransitions.isValidTransition('IDLE', 'QUESTION')).toBe(false);
      expect(stateTransitions.isValidTransition('IDLE', 'CLOSING')).toBe(false);
      expect(stateTransitions.isValidTransition('QUESTION', 'EVALUATING')).toBe(false);
      expect(stateTransitions.isValidTransition('GREETING', 'LISTENING')).toBe(false);
      expect(stateTransitions.isValidTransition('CLOSING', 'GREETING')).toBe(false);
    });

    test('should get allowed transitions from state', () => {
      expect(stateTransitions.getAllowedTransitions('IDLE')).toEqual(['GREETING']);
      expect(stateTransitions.getAllowedTransitions('GREETING')).toEqual(['QUESTION']);
      expect(stateTransitions.getAllowedTransitions('QUESTION')).toEqual(['LISTENING']);
      expect(stateTransitions.getAllowedTransitions('LISTENING')).toContain(
        'EVALUATING'
      );
      expect(stateTransitions.getAllowedTransitions('LISTENING')).toContain(
        'PROMPT_RETRY'
      );
    });
  });

  describe('Session Transition Validation', () => {
    test('should validate LISTENING transition requires valid state before', () => {
      session.state = 'GREETING';
      const result = stateTransitions.validateTransition(session, 'LISTENING');
      expect(result.valid).toBe(false);
    });

    test('should allow LISTENING from QUESTION or PROMPT_RETRY', () => {
      session.state = 'QUESTION';
      let result = stateTransitions.validateTransition(session, 'LISTENING');
      expect(result.valid).toBe(true);

      session.state = 'PROMPT_RETRY';
      result = stateTransitions.validateTransition(session, 'LISTENING');
      expect(result.valid).toBe(true);
    });

    test('should require transcript for EVALUATING transition', () => {
      session.state = 'LISTENING';
      let result = stateTransitions.validateTransition(session, 'EVALUATING', {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('transcript');

      result = stateTransitions.validateTransition(session, 'EVALUATING', {
        transcript: 'valid transcript',
        confidence: 0.9
      });
      expect(result.valid).toBe(true);
    });

    test('should require confidence for EVALUATING transition', () => {
      session.state = 'LISTENING';
      const result = stateTransitions.validateTransition(session, 'EVALUATING', {
        transcript: 'answer'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Confidence');
    });

    test('should prevent PROMPT_RETRY if max retries exceeded', () => {
      session.state = 'LISTENING';
      session.current_retry_count = 2;
      session.max_retries = 2;
      const result = stateTransitions.validateTransition(session, 'PROMPT_RETRY');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Max retries');
    });

    test('should allow PROMPT_RETRY if retries remaining', () => {
      session.state = 'LISTENING';
      session.current_retry_count = 1;
      session.max_retries = 2;
      const result = stateTransitions.validateTransition(session, 'PROMPT_RETRY');
      expect(result.valid).toBe(true);
    });
  });

  describe('Transition Execution', () => {
    test('should execute valid transition', () => {
      session.state = 'IDLE';
      const result = stateTransitions.executeTransition(session, 'GREETING');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('GREETING');
      expect(session.state).toBe('GREETING');
      expect(result.actions.length).toBeGreaterThan(0);
    });

    test('should return error on invalid transition', () => {
      session.state = 'IDLE';
      const result = stateTransitions.executeTransition(session, 'CLOSING');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(session.state).toBe('IDLE');
    });

    test('should include TTS action for GREETING', () => {
      session.state = 'IDLE';
      const result = stateTransitions.executeTransition(session, 'GREETING');

      const ttsAction = result.actions.find(a => a.type === 'TTS');
      expect(ttsAction).toBeDefined();
      expect(ttsAction.text).toContain('John Doe');
      expect(ttsAction.tone).toBe('cheerful');
    });

    test('should include appropriate actions for QUESTION', () => {
      session.state = 'GREETING';
      const result = stateTransitions.executeTransition(session, 'QUESTION');

      expect(result.actions.some(a => a.type === 'LOAD_QUESTION')).toBe(true);
      expect(result.actions.some(a => a.type === 'START_LISTENING')).toBe(true);
      expect(session.question_index).toBe(1);
    });

    test('should include START_STT action for LISTENING', () => {
      session.state = 'QUESTION';
      const result = stateTransitions.executeTransition(session, 'LISTENING');

      expect(result.actions.some(a => a.type === 'START_STT')).toBe(true);
    });

    test('should include EVALUATE_ANSWER action with context', () => {
      session.state = 'LISTENING';
      const result = stateTransitions.executeTransition(session, 'EVALUATING', {
        transcript: 'test answer',
        confidence: 0.85,
        duration_seconds: 30
      });

      const evalAction = result.actions.find(a => a.type === 'EVALUATE_ANSWER');
      expect(evalAction).toBeDefined();
      expect(evalAction.transcript).toBe('test answer');
      expect(evalAction.confidence).toBe(0.85);
    });

    test('should increment retry count for PROMPT_RETRY', () => {
      session.state = 'LISTENING';
      session.current_retry_count = 0;

      const result = stateTransitions.executeTransition(session, 'PROMPT_RETRY');

      expect(result.success).toBe(true);
      expect(session.current_retry_count).toBe(1);
      const uiAction = result.actions.find(a => a.type === 'SHOW_RETRY_UI');
      expect(uiAction.retry_count).toBe(1);
    });

    test('should include TTS and SHOW_RESULTS for CLOSING', () => {
      session.state = 'EVALUATING';
      const result = stateTransitions.executeTransition(session, 'CLOSING');

      expect(result.actions.some(a => a.type === 'TTS')).toBe(true);
      expect(result.actions.some(a => a.type === 'SHOW_RESULTS')).toBe(true);

      const resultsAction = result.actions.find(a => a.type === 'SHOW_RESULTS');
      expect(resultsAction.summary).toBeDefined();
    });
  });

  describe('Next State Determination', () => {
    test('should return PROMPT_RETRY for low confidence', () => {
      session.phase = 2;
      session.question_index = 2;
      const nextState = stateTransitions.getNextStateAfterEvaluation(
        session,
        { total: 50, flag: 'LOW_CONFIDENCE' },
        8
      );
      expect(nextState).toBe('PROMPT_RETRY');
    });

    test('should return PROMPT_RETRY for short answer', () => {
      session.phase = 2;
      session.question_index = 2;
      const nextState = stateTransitions.getNextStateAfterEvaluation(
        session,
        { total: 50, flag: 'ANSWER_TOO_SHORT' },
        8
      );
      expect(nextState).toBe('PROMPT_RETRY');
    });

    test('should skip to QUESTION after max retries', () => {
      session.phase = 2;
      session.question_index = 2;
      session.current_retry_count = 2;
      session.max_retries = 2;

      const nextState = stateTransitions.getNextStateAfterEvaluation(
        session,
        { total: 50, flag: 'ANSWER_TOO_SHORT' },
        8
      );
      expect(nextState).toBe('QUESTION');
    });

    test('should return QUESTION if more questions remain', () => {
      session.phase = 2;
      session.question_index = 2;
      const nextState = stateTransitions.getNextStateAfterEvaluation(
        session,
        { total: 75, flag: null },
        8
      );
      expect(nextState).toBe('QUESTION');
    });

    test('should return CLOSING when all questions done', () => {
      session.question_index = 7;
      const nextState = stateTransitions.getNextStateAfterEvaluation(
        session,
        { total: 75, flag: null },
        8
      );
      expect(nextState).toBe('CLOSING');
    });
  });

  describe('Phase Calculation', () => {
    test('should identify phase 1 for question 0', () => {
      const phase = stateTransitions.getPhaseFromQuestionIndex(0);
      expect(phase).toBe(1);
    });

    test('should identify phase 2 for questions 1-3', () => {
      expect(stateTransitions.getPhaseFromQuestionIndex(1)).toBe(2);
      expect(stateTransitions.getPhaseFromQuestionIndex(2)).toBe(2);
      expect(stateTransitions.getPhaseFromQuestionIndex(3)).toBe(2);
    });

    test('should identify phase 3 for questions 4-5', () => {
      expect(stateTransitions.getPhaseFromQuestionIndex(4)).toBe(3);
      expect(stateTransitions.getPhaseFromQuestionIndex(5)).toBe(3);
    });

    test('should identify phase 3 for questions 4-7', () => {
      expect(stateTransitions.getPhaseFromQuestionIndex(4)).toBe(3);
      expect(stateTransitions.getPhaseFromQuestionIndex(7)).toBe(3);
    });

    test('should identify phase 4 for questions 8-10', () => {
      expect(stateTransitions.getPhaseFromQuestionIndex(8)).toBe(4);
      expect(stateTransitions.getPhaseFromQuestionIndex(10)).toBe(4);
    });

    test('should identify phase 5 for question 11+', () => {
      expect(stateTransitions.getPhaseFromQuestionIndex(11)).toBe(5);
      expect(stateTransitions.getPhaseFromQuestionIndex(12)).toBe(5);
    });
  });

  describe('Complete Interview Flow', () => {
    test('should execute full valid transition sequence', () => {
      // IDLE → GREETING
      let result = stateTransitions.executeTransition(session, 'GREETING');
      expect(result.success).toBe(true);
      expect(session.state).toBe('GREETING');

      // GREETING → QUESTION
      result = stateTransitions.executeTransition(session, 'QUESTION');
      expect(result.success).toBe(true);
      expect(session.state).toBe('QUESTION');
      expect(session.question_index).toBe(1);

      // QUESTION → LISTENING
      result = stateTransitions.executeTransition(session, 'LISTENING');
      expect(result.success).toBe(true);
      expect(session.state).toBe('LISTENING');

      // LISTENING → EVALUATING
      result = stateTransitions.executeTransition(session, 'EVALUATING', {
        transcript: 'valid answer',
        confidence: 0.9,
        duration_seconds: 30
      });
      expect(result.success).toBe(true);
      expect(session.state).toBe('EVALUATING');

      // EVALUATING → QUESTION (next question)
      result = stateTransitions.executeTransition(session, 'QUESTION');
      expect(result.success).toBe(true);
      expect(session.state).toBe('QUESTION');
      expect(session.question_index).toBe(2);
    });

    test('should handle retry sequence', () => {
      session.state = 'LISTENING';
      session.current_retry_count = 0;

      // First attempt - transition to EVALUATING
      let result = stateTransitions.executeTransition(session, 'EVALUATING', {
        transcript: 'short answer here',
        confidence: 0.85,
        duration_seconds: 30
      });
      expect(result.success).toBe(true);

      // Back to LISTENING state to trigger PROMPT_RETRY
      session.state = 'LISTENING';
      result = stateTransitions.executeTransition(session, 'PROMPT_RETRY');
      expect(result.success).toBe(true);
      expect(session.current_retry_count).toBe(1);

      // Retry listening
      session.state = 'PROMPT_RETRY';
      result = stateTransitions.executeTransition(session, 'LISTENING');
      expect(result.success).toBe(true);
    });
  });
});
