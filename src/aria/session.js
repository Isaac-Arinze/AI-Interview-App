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
    /** Count of adaptive follow-up questions spliced in (ADAPTIVE_FOLLOWUPS). */
    this.adaptive_followups_used = 0;
    /** Client proctoring / telemetry events (tab visibility, heartbeats, etc.). */
    this.proctor_events = [];

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
      last_activity: this.last_activity,
      current_transcript: this.current_transcript,
      current_confidence: this.current_confidence,
      questions: this.questions,
      video_url: this.video_url,
      video_size_mb: this.video_size_mb,
      video_uploaded_at: this.video_uploaded_at,
      adaptive_followups_used: this.adaptive_followups_used,
      proctor_events: this.proctor_events
    };
  }

  /**
   * Restore session from persisted JSON (see toJSON).
   * @param {object} data
   * @returns {ARIASession}
   */
  static deserialize(data) {
    if (!data || !data.session_id || !data.candidate) {
      throw new Error('Invalid session snapshot');
    }
    const session = new ARIASession(data.session_id, data.candidate);
    session.state = data.state != null ? data.state : session.state;
    session.question_index =
      data.question_index != null ? data.question_index : session.question_index;
    session.phase = data.phase != null ? data.phase : session.phase;
    session.current_retry_count =
      data.current_retry_count != null ? data.current_retry_count : session.current_retry_count;
    session.max_retries = data.max_retries != null ? data.max_retries : session.max_retries;
    session.answers = Array.isArray(data.answers) ? data.answers : [];
    session.created_at = data.created_at || session.created_at;
    session.expires_at = data.expires_at || session.expires_at;
    session.last_activity = data.last_activity || session.last_activity;
    session.current_transcript =
      data.current_transcript !== undefined ? data.current_transcript : null;
    session.current_confidence =
      data.current_confidence !== undefined ? data.current_confidence : null;
    if (Array.isArray(data.questions)) {
      session.questions = data.questions;
    }
    if (data.video_url !== undefined) session.video_url = data.video_url;
    if (data.video_size_mb !== undefined) session.video_size_mb = data.video_size_mb;
    if (data.video_uploaded_at !== undefined) session.video_uploaded_at = data.video_uploaded_at;
    if (data.adaptive_followups_used != null) {
      session.adaptive_followups_used = data.adaptive_followups_used;
    }
    if (Array.isArray(data.proctor_events)) {
      session.proctor_events = data.proctor_events;
    }
    return session;
  }
}

module.exports = ARIASession;
