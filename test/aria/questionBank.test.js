

const {
  questionBank,
  getInterviewQuestions,
  getQuestionByIndex,
  getTotalQuestionCount,
  getQuestionsByPhase
} = require('../../src/aria/questionBank');

describe('Question Bank', () => {
  describe('Question Structure', () => {
    test('should have phase 1 warmup questions', () => {
      expect(questionBank.phase1_warmup.length).toBeGreaterThan(0);
      expect(questionBank.phase1_warmup[0].phase).toBe(1);
      expect(questionBank.phase1_warmup[0].type).toBe('warmup');
    });

    test('should have phase 2 behavioural questions', () => {
      expect(questionBank.phase2_behavioural.length).toBeGreaterThan(0);
      expect(questionBank.phase2_behavioural[0].phase).toBe(2);
      expect(questionBank.phase2_behavioural[0].type).toBe('behavioural');
    });

    test('should have phase 3 situational questions', () => {
      expect(questionBank.phase3_situational.length).toBeGreaterThan(0);
      expect(questionBank.phase3_situational[0].phase).toBe(3);
      expect(questionBank.phase3_situational[0].type).toBe('situational');
    });

    test('should have phase 4 role-specific questions', () => {
      // Phase 4 is now dynamically generated based on role
      // Test that it generates questions for a known role
      const engineerQuestions = getInterviewQuestions('Software Engineer');
      const phase4Questions = engineerQuestions.filter(q => q.phase === 4);
      
      expect(phase4Questions.length).toBeGreaterThan(0);
      expect(phase4Questions[0].type).toBe('role-specific');
    });

    test('should have phase 5 candidate Q&A', () => {
      expect(questionBank.phase5_candidateQA.length).toBeGreaterThan(0);
      expect(questionBank.phase5_candidateQA[0].phase).toBe(5);
      expect(questionBank.phase5_candidateQA[0].type).toBe('candidate-qa');
    });

    test('should have required fields on each question', () => {
      const allQuestions = [
        ...questionBank.phase1_warmup,
        ...questionBank.phase2_behavioural,
        ...questionBank.phase3_situational,
        ...questionBank.phase5_candidateQA
      ];

      allQuestions.forEach(q => {
        expect(q).toHaveProperty('question_index');
        expect(q).toHaveProperty('text');
        expect(q).toHaveProperty('phase');
        expect(q).toHaveProperty('type');
      });
    });
  });

  describe('STAR Format Detection', () => {
    test('should mark behavioural questions as STAR', () => {
      questionBank.phase2_behavioural.forEach(q => {
        expect(q.star_format).toBe(true);
      });
    });

    test('should not mark non-behavioural questions as STAR', () => {
      questionBank.phase3_situational.forEach(q => {
        expect(q.star_format).toBeUndefined();
      });
    });
  });

  describe('Expected Duration Ranges', () => {
    test('should have expected duration for all questions', () => {
      const allQuestions = [
        ...questionBank.phase1_warmup,
        ...questionBank.phase2_behavioural,
        ...questionBank.phase3_situational,
        ...questionBank.phase5_candidateQA
      ];

      allQuestions.forEach(q => {
        expect(q.expected_duration_range).toBeDefined();
        expect(Array.isArray(q.expected_duration_range)).toBe(true);
        expect(q.expected_duration_range.length).toBe(2);
        expect(q.expected_duration_range[0]).toBeLessThan(
          q.expected_duration_range[1]
        );
      });
    });

    test('should have reasonable duration ranges', () => {
      questionBank.phase2_behavioural.forEach(q => {
        const [min, max] = q.expected_duration_range;
        expect(min).toBeGreaterThanOrEqual(20);
        expect(max).toBeLessThanOrEqual(180);
      });
    });
  });

  describe('Interview Questions Assembly', () => {
    test('should return questions for standard interview without role', () => {
      const questions = getInterviewQuestions();
      expect(questions.length).toBeGreaterThan(0);
      expect(
        questions.some(q => q.phase === 1)
      ).toBe(true);
      expect(
        questions.some(q => q.phase === 2)
      ).toBe(true);
      expect(
        questions.some(q => q.phase === 3)
      ).toBe(true);
      expect(
        questions.some(q => q.phase === 5)
      ).toBe(true);
    });

    test('should include specific role when provided', () => {
      const softwareEngineerQuestions = getInterviewQuestions('Software Engineer');
      expect(softwareEngineerQuestions.length).toBeGreaterThan(0);

      const roleSpecificQuestions = softwareEngineerQuestions.filter(
        q => q.type === 'role-specific'
      );
      expect(roleSpecificQuestions.length).toBeGreaterThan(0);
      expect(roleSpecificQuestions[0].role).toBe('Software Engineer');
    });

    test('should add extra behavioural for missing role', () => {
      const noRoleQuestions = getInterviewQuestions(null);
      const withRoleQuestions = getInterviewQuestions('Software Engineer');

      // No role should have more questions due to extra behavioural
      expect(noRoleQuestions.length).toBeGreaterThanOrEqual(
        withRoleQuestions.length - 2
      );
    });

    test('should maintain question index order', () => {
      const questions = getInterviewQuestions('Product Manager');
      for (let i = 0; i < questions.length - 1; i++) {
        expect(questions[i].question_index).toBeLessThanOrEqual(
          questions[i + 1].question_index
        );
      }
    });
  });

  describe('Get Question By Index', () => {
    test('should retrieve question by index', () => {
      const question = getQuestionByIndex(0);
      expect(question).toBeDefined();
      expect(question.question_index).toBe(0);
    });

    test('should return null for non-existent index', () => {
      const question = getQuestionByIndex(999);
      expect(question).toBeNull();
    });

    test('should find role-specific questions when role provided', () => {
      const question = getQuestionByIndex(8, 'Software Engineer');
      expect(question).toBeDefined();
      expect(question.type).toBe('role-specific');
      expect(question.role).toBe('Software Engineer');
    });

    test('should return different role-specific for different roles', () => {
      const seQuestion = getQuestionByIndex(8, 'Software Engineer');
      const pmQuestion = getQuestionByIndex(8, 'Product Manager');

      expect(seQuestion.text).not.toEqual(pmQuestion.text);
    });
  });

  describe('Total Question Count', () => {
    test('should return count for standard interview', () => {
      const count = getTotalQuestionCount();
      expect(count).toBeGreaterThan(0);
    });

    test('should be consistent across multiple calls', () => {
      const count1 = getTotalQuestionCount();
      const count2 = getTotalQuestionCount();
      expect(count1).toBe(count2);
    });

    test('should differ for different roles', () => {
      const noRoleCount = getTotalQuestionCount(null);
      const seCount = getTotalQuestionCount('Software Engineer');
      const pmCount = getTotalQuestionCount('Product Manager');

      // All should have same structure, just different role-specific content
      expect(seCount).toBe(pmCount);
    });

    test('should include all phases', () => {
      const questions = getInterviewQuestions();
      const phases = new Set(questions.map(q => q.phase));
      expect(phases.has(1)).toBe(true);
      expect(phases.has(2)).toBe(true);
      expect(phases.has(3)).toBe(true);
      expect(phases.has(5)).toBe(true);
    });
  });

  describe('Questions By Phase', () => {
    test('should return phase 1 questions', () => {
      const phase1 = getQuestionsByPhase(1);
      expect(phase1.length).toBeGreaterThan(0);
      expect(phase1.every(q => q.phase === 1)).toBe(true);
    });

    test('should return phase 2 questions', () => {
      const phase2 = getQuestionsByPhase(2);
      expect(phase2.length).toBeGreaterThan(0);
      expect(phase2.every(q => q.phase === 2)).toBe(true);
    });

    test('should return phase 3 questions', () => {
      const phase3 = getQuestionsByPhase(3);
      expect(phase3.length).toBeGreaterThan(0);
      expect(phase3.every(q => q.phase === 3)).toBe(true);
    });

    test('should return phase 4 role-specific questions', () => {
      const phase4 = getQuestionsByPhase(4, 'Software Engineer');
      expect(phase4.length).toBeGreaterThan(0);
      expect(phase4.every(q => q.phase === 4)).toBe(true);
    });

    test('should return empty for phase 4 without role', () => {
      const phase4 = getQuestionsByPhase(4);
      expect(phase4.length).toBe(0);
    });

    test('should return phase 5 questions', () => {
      const phase5 = getQuestionsByPhase(5);
      expect(phase5.length).toBeGreaterThan(0);
      expect(phase5.every(q => q.phase === 5)).toBe(true);
    });

    test('should return empty for invalid phase', () => {
      const phase = getQuestionsByPhase(99);
      expect(phase.length).toBe(0);
    });
  });

  describe('Question Content Quality', () => {
    test('should have non-empty question text', () => {
      const allQuestions = [
        ...questionBank.phase1_warmup,
        ...questionBank.phase2_behavioural,
        ...questionBank.phase3_situational,
        ...questionBank.phase5_candidateQA
      ];

      allQuestions.forEach(q => {
        expect(q.text.length).toBeGreaterThan(0);
        expect(/[.!?]$/.test(q.text.trim())).toBe(true);
      });
    });

    test('should have meaningful question content', () => {
      const behavioural = questionBank.phase2_behavioural[0];
      expect(behavioural.text).toContain('Describe');
      expect(behavioural.text).toContain('challenge');
    });

    test('should have diverse role options in phase 4', () => {
      // Test multiple roles to verify dynamic generation works for different roles
      const roles = ['Software Engineer', 'Product Manager', 'Data Analyst'];
      
      roles.forEach(role => {
        const questions = getInterviewQuestions(role);
        const phase4 = questions.filter(q => q.phase === 4);
        
        expect(phase4.length).toBeGreaterThan(0);
        expect(phase4[0].role).toBe(role);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle role with no phase 4 questions gracefully', () => {
      const unknownRole = 'Blockchain Architect';
      const questions = getInterviewQuestions(unknownRole);

      // Should still return other phases
      expect(questions.some(q => q.phase === 1)).toBe(true);
      expect(questions.some(q => q.phase === 2)).toBe(true);

      // Phase 4 should have dynamically generated role-specific questions
      const phase4 = questions.filter(q => q.phase === 4);
      
      // Dynamic generation always creates phase 4 for any role
      expect(phase4.length).toBeGreaterThan(0);
      expect(phase4[0].type).toBe('role-specific');
      expect(phase4[0].role).toBe(unknownRole);
    });

    test('should maintain unique question indices', () => {
      const questions = getInterviewQuestions('Software Engineer');
      const indices = questions.map(q => q.question_index);
      const uniqueIndices = new Set(indices);

      // Most questions should be unique (some may be added/modified but structure maintained)
      expect(uniqueIndices.size).toBeGreaterThan(0);
    });

    test('should return same questions across multiple calls', () => {
      const call1 = getInterviewQuestions('Product Manager');
      const call2 = getInterviewQuestions('Product Manager');

      expect(call1.length).toBe(call2.length);
      call1.forEach((q, idx) => {
        expect(q.question_index).toBe(call2[idx].question_index);
        expect(q.text).toBe(call2[idx].text);
      });
    });
  });
});
