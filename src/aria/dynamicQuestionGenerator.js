/**
 * Dynamic Question Generator
 * Generates interview questions tailored to specific roles.
 * Questions are created from templates with role-specific context.
 */

// Role definitions with skills and keywords
const roleDefinitions = {
  'Software Engineer': {
    skills: ['coding', 'system design', 'debugging', 'testing', 'architecture'],
    keywords: ['code quality', 'scalability', 'performance', 'technical debt'],
    domain: 'engineering'
  },
  'Product Manager': {
    skills: ['product strategy', 'stakeholder management', 'prioritization', 'data analysis'],
    keywords: ['user research', 'roadmap', 'feature prioritization', 'product launch'],
    domain: 'product'
  },
  'Data Analyst': {
    skills: ['data analysis', 'SQL', 'visualization', 'statistical thinking'],
    keywords: ['data quality', 'insights', 'dashboards', 'metrics'],
    domain: 'analytics'
  },
  'Software Architect': {
    skills: ['system design', 'scalability', 'technology selection', 'standards'],
    keywords: ['distributed systems', 'microservices', 'trade-offs', 'documentation'],
    domain: 'architecture'
  },
  'DevOps Engineer': {
    skills: ['infrastructure', 'automation', 'deployment', 'monitoring'],
    keywords: ['CI/CD', 'cloud platforms', 'containerization', 'reliability'],
    domain: 'devops'
  },
  'Data Scientist': {
    skills: ['machine learning', 'data analysis', 'statistics', 'model building'],
    keywords: ['algorithms', 'model evaluation', 'data visualization', 'experimentation'],
    domain: 'ml'
  },
  'QA Engineer': {
    skills: ['testing', 'automation', 'bug detection', 'quality assurance'],
    keywords: ['test coverage', 'regression', 'edge cases', 'test strategy'],
    domain: 'qa'
  },
  'UX Designer': {
    skills: ['user research', 'prototyping', 'design thinking', 'user testing'],
    keywords: ['user empathy', 'wireframing', 'accessibility', 'design systems'],
    domain: 'design'
  },
  Marketing: {
    skills: ['campaign strategy', 'channel planning', 'content', 'brand positioning'],
    keywords: ['conversion', 'audience targeting', 'messaging', 'growth metrics'],
    domain: 'marketing'
  }
};

// Question templates for phase 4 (role-specific)
const roleSpecificTemplates = {
  engineering: [
    {
      template: "Describe your experience with [SKILL]. What was a particularly challenging [SKILL] problem you solved?",
      skill: 'system design',
      variations: ['scaling systems', 'architecting solutions', 'designing systems']
    },
    {
      template: "Tell me about a time you had to [SKILL]. What was the problem, and how did you approach it?",
      skill: 'debugging',
      variations: ['debug a complex issue', 'troubleshoot a production problem', 'track down a root cause']
    },
    {
      template: "How do you approach [SKILL]? Can you walk me through your methodology with a specific example?",
      skill: 'code quality',
      variations: ['writing maintainable code', 'ensuring code quality', 'reviewing code']
    }
  ],
  product: [
    {
      template: "Describe a product decision you made involving [SKILL]. How did you validate it worked?",
      skill: 'product strategy',
      variations: ['feature prioritization', 'user research', 'customer feedback']
    },
    {
      template: "Walk me through how you handle [SKILL] when you have competing demands from engineering, sales, and customers.",
      skill: 'prioritization',
      variations: ['prioritization', 'trade-offs', 'resource allocation']
    },
    {
      template: "Tell me about a [SKILL] experience. What made it challenging, and what did you learn?",
      skill: 'product launch',
      variations: ['product launch', 'feature release', 'market entry']
    }
  ],
  analytics: [
    {
      template: "Describe an analysis involving [SKILL] that revealed unexpected insights. How did you discover it, and what action did it drive?",
      skill: 'data analysis',
      variations: ['data mining', 'statistical analysis', 'exploratory analysis']
    },
    {
      template: "Tell me about a time you had to work with [SKILL] challenges. How did you handle it?",
      skill: 'data quality',
      variations: ['messy data', 'incomplete datasets', 'data integrity issues']
    },
    {
      template: "Walk me through your approach to [SKILL] for non-technical audiences. Can you give an example?",
      skill: 'data visualization',
      variations: ['presenting data findings', 'creating dashboards', 'telling stories with data']
    }
  ],
  architecture: [
    {
      template: "Describe a [SKILL] decision you made and the trade-offs you considered in choosing it.",
      skill: 'technology selection',
      variations: ['technology selection', 'architectural decision', 'platform choice']
    },
    {
      template: "Tell me about a time you designed a system to handle [SKILL]. Walk me through your approach.",
      skill: 'scalability',
      variations: ['scale', 'high availability', 'fault tolerance', 'performance']
    },
    {
      template: "How do you approach [SKILL] in your architectural designs?",
      skill: 'standards',
      variations: ['documentation', 'integration patterns', 'communication']
    }
  ],
  devops: [
    {
      template: "Describe your experience setting up [SKILL]. What were the challenges, and how did you overcome them?",
      skill: 'CI/CD',
      variations: ['CI/CD pipelines', 'automated deployments', 'continuous integration']
    },
    {
      template: "Tell me about a time you had to optimize [SKILL]. What was the impact?",
      skill: 'infrastructure',
      variations: ['infrastructure', 'deployment process', 'system reliability']
    },
    {
      template: "How do you approach [SKILL] in your infrastructure? Walk me through your strategy.",
      skill: 'monitoring',
      variations: ['monitoring and alerting', 'observability', 'incident response']
    }
  ],
  ml: [
    {
      template: "Describe a machine learning project where you had to choose between [SKILL] approaches. How did you decide?",
      skill: 'algorithms',
      variations: ['different algorithms', 'model types', 'training strategies']
    },
    {
      template: "Tell me about a time you had to improve [SKILL] for a model. What did you learn?",
      skill: 'model evaluation',
      variations: ['model performance', 'evaluation metrics', 'model accuracy']
    },
    {
      template: "Walk me through your approach to [SKILL] with data. Can you give a specific example?",
      skill: 'data preparation',
      variations: ['data preprocessing', 'feature engineering', 'handling edge cases']
    }
  ],
  qa: [
    {
      template: "Describe your approach to [SKILL]. What's your strategy for ensuring comprehensive coverage?",
      skill: 'test coverage',
      variations: ['test coverage', 'test planning', 'test strategy']
    },
    {
      template: "Tell me about a time you discovered a critical [SKILL] issue. How did you find it?",
      skill: 'bug',
      variations: ['bug', 'defect', 'regression', 'edge case']
    },
    {
      template: "Walk me through how you approach [SKILL] in your testing process.",
      skill: 'automation',
      variations: ['test automation', 'automation strategy', 'tool selection']
    }
  ],
  design: [
    {
      template: "Describe a design project where you conducted [SKILL]. What insights did you gain?",
      skill: 'user research',
      variations: ['user research', 'user interviews', 'user testing']
    },
    {
      template: "Tell me about a time you had to balance [SKILL] with user needs. How did you approach it?",
      skill: 'design constraints',
      variations: ['design constraints', 'technical limitations', 'business requirements']
    },
    {
      template: "Walk me through your process for [SKILL]. Can you share a specific example?",
      skill: 'design systems',
      variations: ['creating design systems', 'component design', 'design documentation']
    }
  ],
  marketing: [
    {
      template: "Describe a [SKILL] initiative you owned end to end. What was the goal, what did you execute, and how did you measure success?",
      skill: 'campaign',
      variations: ['marketing campaign', 'multi-channel launch', 'demand-generation program']
    },
    {
      template: "Tell me about a time [SKILL] forced you to change course. What signals did you use and what was the outcome?",
      skill: 'performance data',
      variations: ['underperforming campaign metrics', 'shifting conversion rates', 'weak channel ROI']
    },
    {
      template: "How do you approach [SKILL] when stakeholders disagree? Give a concrete example.",
      skill: 'positioning and messaging',
      variations: ['brand versus performance trade-offs', 'messaging alignment', 'creative direction debates']
    }
  ],
  general: [
    {
      template: "Describe a professional situation where [SKILL] was essential. What was at stake and how did you handle it?",
      skill: 'stakeholder communication',
      variations: ['managing expectations', 'aligning cross-functional partners', 'presenting recommendations']
    },
    {
      template: "Tell me about a time you had to improve [SKILL] with limited resources. What did you prioritize?",
      skill: 'outcomes',
      variations: ['team results', 'process quality', 'customer or internal satisfaction']
    },
    {
      template: "Walk me through how you approach [SKILL] when information is incomplete. What example best illustrates this?",
      skill: 'decision-making',
      variations: ['making a timely call', 'structuring a plan with gaps', 'de-risking uncertainty']
    }
  ]
};

/**
 * Get role definition or return generic if not found
 */
function getRoleDefinition(role) {
  if (!role) return getGenericRoleDefinition();
  
  // Exact match
  if (roleDefinitions[role]) {
    return roleDefinitions[role];
  }

  // Fuzzy match by domain keywords
  const normalizedRole = role.toLowerCase();
  for (const [key, def] of Object.entries(roleDefinitions)) {
    if (key.toLowerCase().includes(normalizedRole) || normalizedRole.includes(key.toLowerCase())) {
      return def;
    }
  }

  // If no match, create dynamic role
  return createDynamicRoleDefinition(role);
}

/**
 * Get generic role definition
 */
function getGenericRoleDefinition() {
  return {
    skills: ['problem solving', 'collaboration', 'communication', 'adaptability'],
    keywords: ['learning', 'growth', 'teamwork', 'impact'],
    domain: 'general'
  };
}

/**
 * Create a dynamic role definition from role name
 */
function createDynamicRoleDefinition(role) {
  // Extract keywords from role name
  const keywords = role.toLowerCase()
    .split(' ')
    .filter(word => word.length > 3);

  return {
    skills: keywords,
    keywords: keywords,
    domain: keywords[0] || 'general'
  };
}

/**
 * Generate role-specific questions
 */
function generateRoleSpecificQuestions(role, baseIndex = 8) {
  const roleDef = getRoleDefinition(role);
  const templates =
    roleSpecificTemplates[roleDef.domain] || roleSpecificTemplates.general;

  const questions = [];

  // Select up to 3 templates and instantiate with role context
  const selectedTemplates = templates.slice(0, 3);

  selectedTemplates.forEach((templateObj, idx) => {
    const variation = templateObj.variations[idx % templateObj.variations.length];
    // Replace ALL occurrences of [SKILL] placeholder
    const body = templateObj.template.replaceAll('[SKILL]', variation);
    const text =
      role && role !== 'Unspecified'
        ? `For the ${role} position: ${body}`
        : body;

    questions.push({
      question_index: baseIndex + idx,
      text,
      phase: 4,
      type: 'role-specific',
      role: role,
      skill_focus: templateObj.skill,
      expected_duration_range: [40, 100]
    });
  });

  return questions;
}

/**
 * Generate specialized questions for common follow-ups
 */
function generateFollowUpQuestions(role, baseIndex = 11) {
  const roleDef = getRoleDefinition(role);
  const skills = roleDef.skills;
  const keywords = roleDef.keywords;

  const followUps = [
    {
      template: `Tell me about a time when your [SKILL] skills were tested. How did you handle it?`,
      skill: skills[0]
    },
    {
      template: `Describe a situation where you had to improve [KEYWORD]. What was your approach?`,
      keyword: keywords[0]
    }
  ];

  return followUps.map((q, idx) => {
    const text = q.template
      .replace('[SKILL]', q.skill || 'expertise')
      .replace('[KEYWORD]', q.keyword || 'performance');

    return {
      question_index: baseIndex + idx,
      text,
      phase: 4,
      type: 'role-specific-followup',
      role: role,
      expected_duration_range: [30, 90]
    };
  });
}

/**
 * Get insight about a role to help with evaluation
 */
function getRoleInsights(role) {
  const roleDef = getRoleDefinition(role);
  return {
    role,
    domain: roleDef.domain,
    keySkills: roleDef.skills,
    keywordsFocus: roleDef.keywords,
    evaluationFocus: [
      `Depth of ${roleDef.skills[0]} knowledge`,
      `Problem-solving approach with ${roleDef.keywords[0]}`,
      `Experience level with ${roleDef.skills.slice(0, 2).join(' and ')}`
    ]
  };
}

module.exports = {
  roleDefinitions,
  roleSpecificTemplates,
  getRoleDefinition,
  getGenericRoleDefinition,
  createDynamicRoleDefinition,
  generateRoleSpecificQuestions,
  generateFollowUpQuestions,
  getRoleInsights
};
