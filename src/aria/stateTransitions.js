/**
 * ARIA State Transitions
 * Implements state machine logic for interview progression.
 * Handles state validation, transitions, and transition actions.
 */

const validStates = [
  'IDLE',
  'GREETING',
  'QUESTION',
  'LISTENING',
  'EVALUATING',
  'PROMPT_RETRY',
  'CLOSING'
];

const transitionRules = {
  IDLE: ['GREETING'],
  GREETING: ['QUESTION'],
  QUESTION: ['LISTENING'],
  LISTENING: ['EVALUATING', 'PROMPT_RETRY'],
  EVALUATING: ['QUESTION', 'CLOSING'],
  PROMPT_RETRY: ['LISTENING', 'EVALUATING'],
  CLOSING: ['IDLE']
};

/**
 * Validate a state
 * @param {string} state - State name
 * @returns {boolean} True if valid
 */
function isValidState(state) {
  return validStates.includes(state);
}

/**
 * Check if a transition is allowed
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @returns {boolean} True if transition allowed
 */
function isValidTransition(fromState, toState) {
  return (
    isValidState(fromState) &&
    isValidState(toState) &&
    transitionRules[fromState]?.includes(toState)
  );
}

/**
 * Get all allowed transitions from a state
 * @param {string} fromState - Current state
 * @returns {array} Array of allowed target states
 */
function getAllowedTransitions(fromState) {
  return transitionRules[fromState] || [];
}

/**
 * Validate session state before transition
 * @param {object} session - ARIASession object
 * @param {string} toState - Target state
 * @param {object} context - Additional context (e.g., answer, flags)
 * @returns {object} { valid: boolean, error: string | null }
 */
function validateTransition(session, toState, context = {}) {
  // Check state machine rules
  if (!isValidTransition(session.state, toState)) {
    return {
      valid: false,
      error: `Invalid transition: ${session.state} → ${toState}`
    };
  }

  // State-specific validation
  switch (toState) {
    case 'LISTENING':
      if (session.state !== 'QUESTION' && session.state !== 'PROMPT_RETRY') {
        return {
          valid: false,
          error: 'Can only enter LISTENING from QUESTION or PROMPT_RETRY'
        };
      }
      break;

    case 'EVALUATING':
      if (!context.transcript || context.transcript.trim().length === 0) {
        return {
          valid: false,
          error: 'Cannot evaluate without transcript'
        };
      }
      if (typeof context.confidence !== 'number') {
        return {
          valid: false,
          error: 'Confidence score required'
        };
      }
      break;

    case 'PROMPT_RETRY':
      if (session.isMaxRetriesExceeded()) {
        return {
          valid: false,
          error: `Max retries (${session.max_retries}) exceeded. Mark question skipped.`
        };
      }
      break;

    case 'CLOSING':
      // Allow from EVALUATING after all questions
      // or from anywhere if session is abandoned/expired
      break;

    default:
      break;
  }

  return { valid: true, error: null };
}

/**
 * Execute transition and return side effects
 * @param {object} session - ARIASession object
 * @param {string} toState - Target state
 * @param {object} context - Transition context
 * @returns {object} { success: boolean, newState: string, actions: array, error: string | null }
 */
function executeTransition(session, toState, context = {}) {
  // Validate first
  const validation = validateTransition(session, toState, context);
  if (!validation.valid) {
    return {
      success: false,
      newState: session.state,
      actions: [],
      error: validation.error
    };
  }

  const actions = [];
  let newState = toState;

  // Execute state-specific side effects
  try {
    switch (toState) {
      case 'GREETING':
        actions.push({
          type: 'TTS',
          text: `Hello ${session.candidate.name}, welcome to your interview for ${session.candidate.role}. Are you ready to begin?`,
          tone: 'cheerful'
        });
        break;

      case 'QUESTION':
        session.nextQuestion();
        actions.push({
          type: 'LOAD_QUESTION',
          question_index: session.question_index
        });
        actions.push({
          type: 'START_LISTENING'
        });
        break;

      case 'LISTENING':
        actions.push({
          type: 'START_STT'
        });
        break;

      case 'EVALUATING':
        // Evaluation handled externally, just note the transition
        actions.push({
          type: 'EVALUATE_ANSWER',
          transcript: context.transcript,
          confidence: context.confidence,
          duration_seconds: context.duration_seconds
        });
        break;

      case 'PROMPT_RETRY':
        const retryCount = session.incrementRetry();
        actions.push({
          type: 'TTS',
          text: `I didn't catch that — please take your time and try again.`,
          tone: 'empathetic'
        });
        actions.push({
          type: 'SHOW_RETRY_UI',
          retry_count: retryCount,
          max_retries: session.max_retries
        });
        break;

      case 'CLOSING':
        actions.push({
          type: 'TTS',
          text: `Thank you for your time. We'll be in touch within 48 hours.`,
          tone: 'empathetic'
        });
        actions.push({
          type: 'SHOW_RESULTS',
          summary: session.getSummary()
        });
        break;

      default:
        break;
    }

    // Update session state
    session.transitionState(toState);

    return {
      success: true,
      newState: toState,
      actions,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      newState: session.state,
      actions: [],
      error: err.message
    };
  }
}

/**
 * Determine next state based on evaluation
 * @param {object} session - ARIASession
 * @param {object} evaluation - Evaluation scores
 * @param {number} totalQuestions - Total questions in interview
 * @returns {string} Recommended next state
 */
function getNextStateAfterEvaluation(session, evaluation, totalQuestions) {
  const { total: score, flag } = evaluation;

  // If answer too short, low confidence, or empty
  if (flag && ['LOW_CONFIDENCE', 'ANSWER_TOO_SHORT'].includes(flag)) {
    if (!session.isMaxRetriesExceeded()) {
      return 'PROMPT_RETRY';
    } else {
      // Mark skipped and advance
      return 'QUESTION';
    }
  }

  // Check if more questions remaining
  if (session.question_index < totalQuestions - 1) {
    return 'QUESTION';
  }

  // All questions done
  return 'CLOSING';
}

/**
 * Get current phase from question index
 * @param {number} questionIndex - Current question index
 * @returns {number} Phase 1-5
 */
function getPhaseFromQuestionIndex(questionIndex) {
  if (questionIndex === 0) return 1; // Warm-up (question 0)
  if (questionIndex <= 3) return 2; // Behavioral (questions 1-3)
  if (questionIndex <= 7) return 3; // Situational (questions 4-7)
  if (questionIndex <= 10) return 4; // Role-specific (questions 8-10)
  return 5; // Candidate Q&A (question 11)
}

module.exports = {
  validStates,
  transitionRules,
  isValidState,
  isValidTransition,
  getAllowedTransitions,
  validateTransition,
  executeTransition,
  getNextStateAfterEvaluation,
  getPhaseFromQuestionIndex
};
