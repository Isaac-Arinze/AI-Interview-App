/**
 * ARIA Session Manager
 * Manages individual interview sessions with state transitions, answer tracking,
 * and session lifecycle management.
 */

const { v4: uuidv4 } = require('uuid');

class ARIASession {
  constructor(sessionId, candidate) {
    this.session_id = sessionId || uuidv4();
    this.candidate = {
      name: candidate.name || 'Candidate',
      role: candidate.role || 'Unspecified',
      language: candidate.language || 'en-US'
    };
    
    // State management
    this.state = 'IDLE';
    this.question_index = 0;
    this.phase = 1;
    this.current_retry_count = 0;
    this.max_retries = 2;
    
    // Answer tracking
    this.answers = [];
    this.current_transcript = null;
    this.current_confidence = null;
    
    // Timestamps
    this.created_at = new Date().toISOString();
    this.expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min TTL
    this.last_activity = new Date().toISOString();
  }

  /**
   * Transition state with validation
   */
  transitionState(newState) {
    const validStates = [
      'IDLE',
      'GREETING',
      'QUESTION',
      'LISTENING',
      'EVALUATING',
      'PROMPT_RETRY',
      'CLOSING'
    ];

    if (!validStates.includes(newState)) {
      throw new Error(`Invalid state: ${newState}`);
    }

    // Enforce state transition rules
    const transitionMap = {
      IDLE: ['GREETING'],
      GREETING: ['QUESTION'],
      QUESTION: ['LISTENING'],
      LISTENING: ['EVALUATING', 'PROMPT_RETRY'],
      EVALUATING: ['QUESTION', 'CLOSING'],
      PROMPT_RETRY: ['LISTENING', 'EVALUATING'],
      CLOSING: ['IDLE']
    };

    if (!transitionMap[this.state]?.includes(newState)) {
      throw new Error(
        `Invalid transition: ${this.state} → ${newState}`
      );
    }

    this.state = newState;
    this.last_activity = new Date().toISOString();
  }

  /**
   * Record an answer for the current question
   */
  recordAnswer(transcript, confidence, duration, flags = []) {
    const answer = {
      question_index: this.question_index,
      transcript,
      confidence: parseFloat(confidence) || 0,
      duration_seconds: parseFloat(duration) || 0,
      flags,
      scores: {
        relevance: null,
        depth: null,
        structure: null,
        communication: null,
        total: null
      },
      timestamp: new Date().toISOString()
    };

    this.answers.push(answer);
    return answer;
  }

  /**
   * Update scores for most recent answer
   */
  updateLastAnswerScores(scores) {
    if (this.answers.length === 0) {
      throw new Error('No answers to update');
    }

    const lastAnswer = this.answers[this.answers.length - 1];
    lastAnswer.scores = {
      relevance: scores.relevance || 0,
      depth: scores.depth || 0,
      structure: scores.structure || 0,
      communication: scores.communication || 0,
      total: (scores.relevance || 0) + 
             (scores.depth || 0) + 
             (scores.structure || 0) + 
             (scores.communication || 0)
    };

    return lastAnswer;
  }

  /**
   * Move to next question
   */
  nextQuestion() {
    this.question_index++;
    this.current_retry_count = 0;
    this.current_transcript = null;
    this.current_confidence = null;
  }

  /**
   * Increment retry counter
   */
  incrementRetry() {
    this.current_retry_count++;
    return this.current_retry_count;
  }

  /**
   * Check if max retries exceeded
   */
  isMaxRetriesExceeded() {
    return this.current_retry_count >= this.max_retries;
  }

  /**
   * Check if session is expired
   */
  isExpired() {
    return new Date() > new Date(this.expires_at);
  }

  /**
   * Extend session TTL
   */
  extendTTL(minutes = 5) {
    this.expires_at = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  }

  /**
   * Get session summary
   */
  getSummary() {
    const answeredCount = this.answers.length;
    const skippedCount = Math.max(0, this.question_index - answeredCount);
    
    const totalScore = this.answers.length > 0
      ? this.answers.reduce((sum, a) => sum + (a.scores.total || 0), 0) / this.answers.length
      : 0;

    return {
      session_id: this.session_id,
      candidate: this.candidate,
      state: this.state,
      total_questions: this.question_index,
      answered: answeredCount,
      skipped: skippedCount,
      overall_score: parseFloat(totalScore.toFixed(2)),
      per_question: this.answers.map((a, idx) => ({
        question_index: idx,
        scores: a.scores,
        flags: a.flags,
        duration_seconds: a.duration_seconds
      })),
      created_at: this.created_at,
      expires_at: this.expires_at
    };
  }

  /**
   * Serialize to JSON for storage
   */
  toJSON() {
    return {
      session_id: this.session_id,
      candidate: this.candidate,
      state: this.state,
      question_index: this.question_index,
      phase: this.phase,
      current_retry_count: this.current_retry_count,
      max_retries: this.max_retries,
      answers: this.answers,
      created_at: this.created_at,
      expires_at: this.expires_at,
      last_activity: this.last_activity
    };
  }
}

module.exports = ARIASession;
