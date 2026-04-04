/**
 * ARIA Question Bank
 * Stores interview questions organized by phase and role.
 * Supports adaptive selection and role-specific customization.
 * Phase 4 questions are now dynamically generated based on role.
 */

const DynamicQG = require('./dynamicQuestionGenerator');

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

/**
 * Get all questions for a standard interview
 * @param {string} role - Job title/role for role-specific questions
 * @returns {array} Ordered array of questions (dynamically generated for phase 4)
 */
function getInterviewQuestions(role = null) {
  const questions = [
    ...questionBank.phase1_warmup,
    ...questionBank.phase2_behavioural,
    ...questionBank.phase3_situational
  ];

  // Generate role-specific questions dynamically
  if (role) {
    const roleSpecificQuestions = DynamicQG.generateRoleSpecificQuestions(role, 8);
    questions.push(...roleSpecificQuestions);
  } else {
    // If no role, add extra behavioural question
    if (questionBank.phase2_behavioural.length > 0) {
      const extraBehavioural = {
        ...questionBank.phase2_behavioural[0],
        question_index: 8,
        text: "Tell me about a situation where you had to adapt to unexpected changes. How did you handle it?"
      };
      questions.push(extraBehavioural);
    }
  }

  // Add candidate Q&A
  questions.push(...questionBank.phase5_candidateQA);

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
  const phaseMap = {
    1: questionBank.phase1_warmup,
    2: questionBank.phase2_behavioural,
    3: questionBank.phase3_situational,
    4: role ? DynamicQG.generateRoleSpecificQuestions(role, 8) : [],
    5: questionBank.phase5_candidateQA
  };

  return phaseMap[phase] || [];
}

module.exports = {
  questionBank,
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
