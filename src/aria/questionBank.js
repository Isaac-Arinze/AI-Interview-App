/**
 * ARIA Question Bank
 * Stores interview questions organized by phase and role.
 * Supports adaptive selection and role-specific customization.
 * Phase 4 questions are now dynamically generated based on role.
 */

const DynamicQG = require('./dynamicQuestionGenerator');

/**
 * Map interviewee domain to situational prompts so non-engineering roles
 * are not asked purely technical incident questions.
 */
function resolveSituationalDomain(role) {
  if (!role || role === 'Unspecified') return 'general';
  const def = DynamicQG.getRoleDefinition(role);
  const d = def.domain;
  if (['engineering', 'architecture', 'devops', 'qa'].includes(d)) {
    return 'engineering';
  }
  if (d === 'product') return 'product';
  if (d === 'analytics' || d === 'ml') return 'analytics';
  if (d === 'marketing') return 'marketing';
  if (d === 'design') return 'design';
  return 'general';
}

const situationalByDomain = {
  engineering: [
    {
      question_index: 4,
      text: 'How would you handle disagreement with a colleague on a technical decision? Walk me through your approach.',
      phase: 3,
      type: 'situational',
      expected_duration_range: [30, 90]
    },
    {
      question_index: 5,
      text: 'If a critical system went down during your shift without clear root cause, what would be your first three actions?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 6,
      text: 'Tell me about a time you had to deliver a technical or engineering project with limited resources. How did you prioritize and what trade-offs did you make?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 7,
      text: 'Describe a situation where you received critical feedback on your technical work. How did you respond, and what did you learn?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 90]
    }
  ],
  product: [
    {
      question_index: 4,
      text: 'You and engineering disagree on scope for the next release—engineering wants to cut a feature customers asked for. How do you proceed?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 95]
    },
    {
      question_index: 5,
      text: 'A launch date is at risk and leadership is divided on whether to cut scope or move the date. What is your process?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 6,
      text: 'You have limited engineering capacity next quarter but multiple stakeholder requests. How do you prioritize the roadmap?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 7,
      text: 'Describe a time you received pushback on a product decision you owned. How did you handle it and what changed?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 90]
    }
  ],
  analytics: [
    {
      question_index: 4,
      text: 'A stakeholder doubts your analysis and prefers their intuition. How do you respond while keeping trust?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 95]
    },
    {
      question_index: 5,
      text: 'You discover serious data quality issues halfway through a high-visibility project. What do you do first?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 6,
      text: 'Two metrics point to different conclusions about performance. How do you reconcile them and communicate to leadership?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 7,
      text: 'You are asked for a dashboard or report on a tight deadline with incomplete data. How do you scope and deliver?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 90]
    }
  ],
  marketing: [
    {
      question_index: 4,
      text: 'A campaign is underperforming mid-flight versus benchmarks. What steps do you take and what do you communicate?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 95]
    },
    {
      question_index: 5,
      text: 'Sales or product disagrees with your proposed messaging or positioning. How do you align stakeholders?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 95]
    },
    {
      question_index: 6,
      text: 'Budget is cut but leadership keeps the same pipeline or revenue goals. How do you reprioritize channels or tactics?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 7,
      text: 'Legal or brand flags a creative or copy direction as risky. How do you handle it while protecting results?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 90]
    }
  ],
  design: [
    {
      question_index: 4,
      text: 'Product wants more scope in the same timeline and UX quality is at risk. How do you negotiate and decide?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 95]
    },
    {
      question_index: 5,
      text: 'Engineering says a key design is not feasible as specified. How do you collaborate to land a strong outcome?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 95]
    },
    {
      question_index: 6,
      text: 'User research conflicts with a strong stakeholder opinion. What is your approach?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 95]
    },
    {
      question_index: 7,
      text: 'An accessibility or inclusion issue is raised late in the process. How do you respond?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 90]
    }
  ],
  general: [
    {
      question_index: 4,
      text: 'How would you handle disagreement with a colleague on an important work decision? Walk me through your approach.',
      phase: 3,
      type: 'situational',
      expected_duration_range: [30, 90]
    },
    {
      question_index: 5,
      text: 'If a high-visibility deliverable went wrong and the cause was unclear, what would be your first three actions?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 6,
      text: 'Tell me about a time you had to deliver results with limited time or resources. How did you prioritize and what trade-offs did you make?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 7,
      text: 'Describe a situation where you received critical feedback. How did you respond, and what did you learn?',
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 90]
    }
  ]
};

const questionBank = {
  phase1_warmup: [
    {
      question_index: 0,
      text: "Tell me about your background and why you're interested in this role.",
      phase: 1,
      type: 'warmup',
      expected_duration_range: [20, 60]
    }
  ],

  phase2_behavioural: [
    {
      question_index: 1,
      text: "Describe a time you overcame a significant challenge at work. What was the situation, what did you do, and what was the outcome?",
      phase: 2,
      type: 'behavioural',
      star_format: true,
      expected_duration_range: [45, 120]
    },
    {
      question_index: 2,
      text: "Tell me about a project where you led a team. What was your role, what challenges did you face, and how did you overcome them?",
      phase: 2,
      type: 'behavioural',
      star_format: true,
      expected_duration_range: [45, 120]
    },
    {
      question_index: 3,
      text: "Give an example of when you had to learn something new quickly. How did you approach it, and what was the result?",
      phase: 2,
      type: 'behavioural',
      star_format: true,
      expected_duration_range: [30, 90]
    }
  ],

  phase3_situational: [
    {
      question_index: 4,
      text: "How would you handle disagreement with a colleague on a technical decision? Walk me through your approach.",
      phase: 3,
      type: 'situational',
      expected_duration_range: [30, 90]
    },
    {
      question_index: 5,
      text: "If a critical system went down during your shift without clear root cause, what would be your first three actions?",
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 6,
      text: "Tell me about a time you had to deliver a project with limited resources. How did you prioritize and what trade-offs did you make?",
      phase: 3,
      type: 'situational',
      expected_duration_range: [40, 100]
    },
    {
      question_index: 7,
      text: "Describe a situation where you received critical feedback. How did you respond, and what did you learn?",
      phase: 3,
      type: 'situational',
      expected_duration_range: [35, 90]
    }
  ],

  // NOTE: phase4_role_specific is now DEPRECATED
  // Role-specific questions are generated dynamically by DynamicQG.generateRoleSpecificQuestions()
  // This provides flexibility to generate questions for any role without hardcoding
  phase4_role_specific: {
    // Kept for backward compatibility only - not used in production
  },

  phase5_candidateQA: [
    {
      question_index: 11,
      text: "Do you have any questions for me about the role or the team?",
      phase: 5,
      type: 'candidate-qa',
      expected_duration_range: [20, 180]
    }
  ]
};

function cloneQuestion(q, overrides = {}) {
  return { ...q, ...overrides };
}

/**
 * Phases 1–3: warmup, behavioural, and domain-appropriate situational prompts.
 * When role is missing or "Unspecified", uses the static bank (unchanged).
 */
function buildTailoredBaseQuestions(role) {
  const useRole = role && role !== 'Unspecified';
  if (!useRole) {
    return [
      ...questionBank.phase1_warmup.map((q) => ({ ...q })),
      ...questionBank.phase2_behavioural.map((q) => ({ ...q })),
      ...questionBank.phase3_situational.map((q) => ({ ...q }))
    ];
  }

  const domain = resolveSituationalDomain(role);
  const situational =
    situationalByDomain[domain] || situationalByDomain.general;

  const p1 = cloneQuestion(questionBank.phase1_warmup[0], {
    text: `Walk me through your background and what makes you a strong fit for this ${role} role specifically.`
  });

  const p2 = questionBank.phase2_behavioural.map((q) =>
    cloneQuestion(q, {
      text: `In examples that reflect your experience relevant to a ${role}: ${q.text}`
    })
  );

  const p3 = situational.map((q) => ({ ...q }));

  return [p1, ...p2, ...p3];
}

/**
 * Get all questions for a standard interview
 * @param {string} role - Job title/role for role-specific questions
 * @returns {array} Ordered array of questions (dynamically generated for phase 4)
 */
function getInterviewQuestions(role = null) {
  const useRole = role && role !== 'Unspecified';
  const questions = [...buildTailoredBaseQuestions(role)];

  if (useRole) {
    questions.push(...DynamicQG.generateRoleSpecificQuestions(role, 8));
  } else {
    if (questionBank.phase2_behavioural.length > 0) {
      const extraBehavioural = {
        ...questionBank.phase2_behavioural[0],
        question_index: 8,
        text: "Tell me about a situation where you had to adapt to unexpected changes. How did you handle it?"
      };
      questions.push(extraBehavioural);
    }
  }

  const phase5 = questionBank.phase5_candidateQA.map((q) => ({
    ...q,
    text: useRole
      ? `Do you have any questions for us about this ${role} role or the team?`
      : q.text
  }));

  questions.push(...phase5);

  return questions;
}

/**
 * Get a specific question by index
 * @param {number} index - Question index
 * @param {string} role - Job role for context
 * @returns {object} Question object or null
 */
function getQuestionByIndex(index, role = null) {
  const questions = getInterviewQuestions(role);
  return questions.find(q => q.question_index === index) || null;
}

/**
 * Get total question count for a role
 * @param {string} role - Job role
 * @returns {number} Total questions
 */
function getTotalQuestionCount(role = null) {
  return getInterviewQuestions(role).length;
}

/**
 * Get questions by phase
 * @param {number} phase - Phase number (1-5)
 * @param {string} role - Job role for phase 4 (used for dynamic generation)
 * @returns {array} Questions in that phase (dynamically generated for phase 4)
 */
function getQuestionsByPhase(phase, role = null) {
  if (phase === 4) {
    return role ? DynamicQG.generateRoleSpecificQuestions(role, 8) : [];
  }

  const useRole = role && role !== 'Unspecified';
  if (useRole && [1, 2, 3].includes(phase)) {
    return buildTailoredBaseQuestions(role).filter((q) => q.phase === phase);
  }
  if (useRole && phase === 5) {
    return questionBank.phase5_candidateQA.map((q) => ({
      ...q,
      text: `Do you have any questions for us about this ${role} role or the team?`
    }));
  }

  const phaseMap = {
    1: questionBank.phase1_warmup,
    2: questionBank.phase2_behavioural,
    3: questionBank.phase3_situational,
    5: questionBank.phase5_candidateQA
  };

  return phaseMap[phase] || [];
}

/**
 * Keep only the first n questions and renumber question_index (0..n-1).
 * Used for quick test runs (e.g. 2 questions then summary).
 */
function takeFirstNInterviewQuestions(questions, n) {
  const count = Math.min(Math.max(1, n), questions.length);
  return questions.slice(0, count).map((q, i) => ({ ...q, question_index: i }));
}

module.exports = {
  questionBank,
  buildTailoredBaseQuestions,
  takeFirstNInterviewQuestions,
  getInterviewQuestions,
  getQuestionByIndex,
  getTotalQuestionCount,
  getQuestionsByPhase,
  // Export dynamic question generation functions
  getRoleDefinition: DynamicQG.getRoleDefinition,
  generateRoleSpecificQuestions: DynamicQG.generateRoleSpecificQuestions,
  generateFollowUpQuestions: DynamicQG.generateFollowUpQuestions,
  getRoleInsights: DynamicQG.getRoleInsights
};
