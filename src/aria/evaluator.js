/**
 * ARIA Evaluator
 * Scores candidate answers across four dimensions: relevance, depth, structure, communication.
 * Uses LLM-ready rubric; can be extended with actual LLM integration.
 */

const relevanceRubric = [
  {
    score: 25,
    criteria: 'Directly addresses the question with no deviation or tangents. Highly relevant.'
  },
  {
    score: 18,
    criteria: 'Mostly relevant with minor tangents. Core of answer is on-topic.'
  },
  {
    score: 10,
    criteria: 'On topic but lacks clear focus. Some relevant content mixed with extraneous details.'
  },
  { score: 0, criteria: 'Completely off-topic or no meaningful connection to question.' }
];

const depthRubric = [
  {
    score: 25,
    criteria: 'Rich examples, specific metrics, quantifiable outcomes. Demonstrates mastery.'
  },
  {
    score: 18,
    criteria: 'Adequate detail with 1-2 clear examples. Specific outcomes mentioned.'
  },
  {
    score: 10,
    criteria: 'Minimal detail or vague outcomes. Limited supporting evidence.'
  },
  {
    score: 0,
    criteria: 'Surface-level response with no supporting evidence or examples.'
  }
];

const structureRubric = [
  {
    score: 25,
    criteria: 'Perfect logical flow. For behavioural: clear STAR. Easy to follow.'
  },
  {
    score: 18,
    criteria: 'Clear structure with minor gaps. Reasoning flow is evident.'
  },
  {
    score: 10,
    criteria: 'Somewhat disorganised. Requires mental effort to piece together.'
  },
  {
    score: 0,
    criteria: 'Rambling, incoherent, or no discernible structure.'
  }
];

const communicationRubric = [
  {
    score: 25,
    criteria:
      'Professional tone, clear articulation, concise, minimal filler words.'
  },
  {
    score: 18,
    criteria:
      'Good communication with minor filler words or slightly verbose.'
  },
  {
    score: 10,
    criteria:
      'Adequate but verbose or periodically unclear. Some comprehension effort required.'
  },
  {
    score: 0,
    criteria:
      'Unintelligible, inappropriate tone, or severely impaired communication.'
  }
];

/**
 * Evaluate an answer across all dimensions
 * Simple heuristic-based scoring; can integrate LLM later
 * @param {object} answer - Answer object with transcript, duration, phase, question_type
 * @returns {object} Scores object
 */
function evaluateAnswer(answer) {
  const {
    transcript = '',
    duration_seconds = 0,
    confidence = 1.0,
    phase = 2,
    type = 'behavioural'
  } = answer;

  // Validate preconditions
  if (confidence < 0.45) {
    return {
      relevance: null,
      depth: null,
      structure: null,
      communication: null,
      total: null,
      flag: 'LOW_CONFIDENCE',
      reason: `Confidence ${confidence} below threshold 0.45`
    };
  }

  if (duration_seconds < 4) {
    return {
      relevance: null,
      depth: null,
      structure: null,
      communication: null,
      total: null,
      flag: 'ANSWER_TOO_SHORT',
      reason: `Duration ${duration_seconds}s below minimum 4s`
    };
  }

  if (duration_seconds > 180) {
    return {
      relevance: null,
      depth: null,
      structure: null,
      communication: null,
      total: null,
      flag: 'TRUNCATED',
      reason: `Duration ${duration_seconds}s exceeds 180s limit. Truncated.`
    };
  }

  // Heuristic-based scoring
  const wordCount = transcript.split(/\s+/).length;
  const sentenceCount = (transcript.match(/[.!?]+/g) || []).length;

  // RELEVANCE: Check for question keywords (placeholder logic)
  let relevance = 10;
  if (wordCount > 20) relevance = 18;
  if (wordCount > 50 && sentenceCount > 3) relevance = 25;

  // DEPTH: Word count and detail signals
  let depth = 0;
  if (wordCount > 30) depth = 10;
  if (wordCount > 80 && sentenceCount > 4) depth = 18;
  if (wordCount > 150 && sentenceCount > 5) depth = 25;

  // STRUCTURE: Check for STAR signals (Situation, Task, Action, Result)
  let structure = 10;
  if (type === 'behavioural') {
    const starSignals = [
      /situation|starting|context|was/i,
      /task|challenge|problem|assigned/i,
      /did|took|implemented|decided/i,
      /result|outcome|learned|improved/i
    ];
    const matchCount = starSignals.filter(sig => sig.test(transcript)).length;
    if (matchCount >= 3) structure = 20;
    if (matchCount === 4) structure = 25;
  } else {
    // Situational: check for reasoning flow
    if (sentenceCount > 3) structure = 18;
    if (sentenceCount > 5) structure = 25;
  }

  // COMMUNICATION: Filler words and clarity (placeholder)
  let communication = 15;
  const fillerWords = (
    transcript.match(/um|uh|like|you know|basically|kind of|sort of/gi) || []
  ).length;
  if (fillerWords < 3) communication = 20;
  if (fillerWords === 0) communication = 25;
  if (fillerWords > 7) communication = 10;

  // Adjust communication for duration (longer = more natural)
  if (duration_seconds > 90) communication = Math.min(25, communication + 2);

  const total = relevance + depth + structure + communication;

  return {
    relevance,
    depth,
    structure,
    communication,
    total,
    flag: null,
    reason: null
  };
}

/**
 * Get acknowledgment phrase based on score (never reveal the score)
 * @param {number} totalScore - Total score 0-100
 * @returns {string} Acknowledgment phrase
 */
function getAcknowledgmentPhrase(totalScore) {
  if (totalScore >= 80) {
    return "Thank you, that's really helpful context.";
  }
  if (totalScore >= 50) {
    return 'Understood, thank you for sharing that.';
  }
  return 'Thank you. Let\'s move on to the next question.';
}

/**
 * Determine if follow-up is warranted (behavioural answers scoring low)
 * @param {number} totalScore - Total score 0-100
 * @param {number} phase - Interview phase
 * @returns {boolean} Whether a follow-up is recommended
 */
function shouldFollowUp(totalScore, phase) {
  // Only follow-up on behavioural questions (phase 2) that score below 40
  return phase === 2 && totalScore < 40;
}

/**
 * Generate follow-up question
 * @param {object} questioningContext - Context from original question
 * @returns {string} Follow-up question text
 */
function generateFollowUp(questioningContext = {}) {
  const followUps = [
    "Can you walk me through that situation a bit more? What specifically did you do?",
    "Help me understand the outcome better. What measurable improvements did you see?",
    "Tell me more about the challenge you faced. How did you approach solving it?",
    "What would you do differently if you faced that same situation again?",
    "What was the key learning for you from that experience?"
  ];

  return followUps[Math.floor(Math.random() * followUps.length)];
}

/**
 * Score all answers in a session and return summary
 * @param {array} answers - Array of answer objects
 * @returns {object} Summary with averages and insights
 */
function scoreSession(answers) {
  if (!answers || answers.length === 0) {
    return {
      total_questions: 0,
      avg_score: 0,
      avg_duration: 0,
      dimension_averages: {
        relevance: 0,
        depth: 0,
        structure: 0,
        communication: 0
      }
    };
  }

  const scores = answers.map(a => a.scores.total || 0);
  const avgScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
    : 0;

  const avgDuration = (
    answers.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / answers.length
  ).toFixed(0);

  const dimensionAverages = {
    relevance: (
      answers.reduce((sum, a) => sum + (a.scores.relevance || 0), 0) / answers.length
    ).toFixed(2),
    depth: (
      answers.reduce((sum, a) => sum + (a.scores.depth || 0), 0) / answers.length
    ).toFixed(2),
    structure: (
      answers.reduce((sum, a) => sum + (a.scores.structure || 0), 0) / answers.length
    ).toFixed(2),
    communication: (
      answers.reduce((sum, a) => sum + (a.scores.communication || 0), 0) / answers.length
    ).toFixed(2)
  };

  return {
    total_questions: answers.length,
    avg_score: parseFloat(avgScore),
    avg_duration: parseFloat(avgDuration),
    dimension_averages: {
      relevance: parseFloat(dimensionAverages.relevance),
      depth: parseFloat(dimensionAverages.depth),
      structure: parseFloat(dimensionAverages.structure),
      communication: parseFloat(dimensionAverages.communication)
    }
  };
}

module.exports = {
  relevanceRubric,
  depthRubric,
  structureRubric,
  communicationRubric,
  evaluateAnswer,
  getAcknowledgmentPhrase,
  shouldFollowUp,
  generateFollowUp,
  scoreSession
};
