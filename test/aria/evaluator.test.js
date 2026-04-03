/**
 * Unit Tests for ARIA Evaluator
 */

const {
  evaluateAnswer,
  getAcknowledgmentPhrase,
  shouldFollowUp,
  generateFollowUp,
  scoreSession
} = require('../../src/aria/evaluator');

describe('ARIA Evaluator', () => {
  describe('evaluateAnswer', () => {
    test('should flag low confidence answers', () => {
      const answer = {
        transcript: 'short answer',
        duration_seconds: 10,
        confidence: 0.3,
        phase: 2
      };

      const evaluation = evaluateAnswer(answer);
      expect(evaluation.flag).toBe('LOW_CONFIDENCE');
      expect(evaluation.total).toBeNull();
    });

    test('should flag too-short answers', () => {
      const answer = {
        transcript: 'hello',
        duration_seconds: 2,
        confidence: 0.9,
        phase: 2
      };

      const evaluation = evaluateAnswer(answer);
      expect(evaluation.flag).toBe('ANSWER_TOO_SHORT');
      expect(evaluation.total).toBeNull();
    });

    test('should flag truncated answers', () => {
      const answer = {
        transcript: 'a'.repeat(500),
        duration_seconds: 200,
        confidence: 0.9,
        phase: 2
      };

      const evaluation = evaluateAnswer(answer);
      expect(evaluation.flag).toBe('TRUNCATED');
      expect(evaluation.total).toBeNull();
    });

    test('should score valid answer', () => {
      const answer = {
        transcript:
          'The situation was when we had a major production outage. My task was to lead the diagnostics. We implemented a rollback and then root cause analysis. The result was we prevented similar issues going forward.',
        duration_seconds: 45,
        confidence: 0.95,
        phase: 2,
        type: 'behavioural'
      };

      const evaluation = evaluateAnswer(answer);
      expect(evaluation.flag).toBeNull();
      expect(evaluation.total).toBeGreaterThan(0);
      expect(evaluation.relevance).toBeGreaterThan(0);
      expect(evaluation.depth).toBeGreaterThan(0);
    });

    test('should score short but valid answer', () => {
      const answer = {
        transcript: 'I overcame a challenge by working hard. The result was good.',
        duration_seconds: 10,
        confidence: 0.85,
        phase: 2
      };

      const evaluation = evaluateAnswer(answer);
      expect(evaluation.flag).toBeNull();
      expect(evaluation.total).toBeGreaterThan(0);
    });

    test('should detect STAR format in behavioural answers', () => {
      const starAnswer = {
        transcript:
          'Situation: we had a production issue. Task: I was assigned to fix it. Action: I debugged the system. Result: fixed within 2 hours with no data loss.',
        duration_seconds: 35,
        confidence: 0.9,
        phase: 2,
        type: 'behavioural'
      };

      const evaluation = evaluateAnswer(starAnswer);
      expect(evaluation.structure).toBeGreaterThanOrEqual(20);
    });

    test('should penalize excessive filler words', () => {
      const fillerAnswer = {
        transcript:
          'Um, like, you know, basically I was, like, in this situation where, um, like, things were happening. Um, yeah.',
        duration_seconds: 30,
        confidence: 0.9,
        phase: 2
      };

      const evaluation = evaluateAnswer(fillerAnswer);
      expect(evaluation.communication).toBeLessThan(15);
    });

    test('should handle default parameters', () => {
      const minimalAnswer = {
        transcript: 'I learned something new by doing practice exercises.'
      };

      const evaluation = evaluateAnswer(minimalAnswer);
      expect(evaluation.flag).toBe('ANSWER_TOO_SHORT');
    });
  });

  describe('Acknowledgment Phrases', () => {
    test('should return high-score phrase for 80+', () => {
      const phrase = getAcknowledgmentPhrase(85);
      expect(phrase).toBe("Thank you, that's really helpful context.");
    });

    test('should return mid-score phrase for 50-79', () => {
      const phrase = getAcknowledgmentPhrase(65);
      expect(phrase).toBe('Understood, thank you for sharing that.');
    });

    test('should return low-score phrase for 0-49', () => {
      const phrase = getAcknowledgmentPhrase(35);
      expect(phrase).toBe('Thank you. Let\'s move on to the next question.');
    });

    test('should handle boundary scores', () => {
      expect(getAcknowledgmentPhrase(80)).toBe(
        "Thank you, that's really helpful context."
      );
      expect(getAcknowledgmentPhrase(79)).toBe(
        'Understood, thank you for sharing that.'
      );
      expect(getAcknowledgmentPhrase(50)).toBe(
        'Understood, thank you for sharing that.'
      );
      expect(getAcknowledgmentPhrase(49)).toBe(
        'Thank you. Let\'s move on to the next question.'
      );
    });
  });

  describe('Follow-up Logic', () => {
    test('should recommend follow-up for low phase-2 scores', () => {
      const shouldFollowUpResult = shouldFollowUp(35, 2);
      expect(shouldFollowUpResult).toBe(true);
    });

    test('should not recommend follow-up for high phase-2 scores', () => {
      const shouldFollowUpResult = shouldFollowUp(50, 2);
      expect(shouldFollowUpResult).toBe(false);
    });

    test('should not recommend follow-up for other phases', () => {
      expect(shouldFollowUp(30, 1)).toBe(false);
      expect(shouldFollowUp(30, 3)).toBe(false);
      expect(shouldFollowUp(30, 4)).toBe(false);
      expect(shouldFollowUp(30, 5)).toBe(false);
    });

    test('should generate valid follow-up questions', () => {
      const followUp = generateFollowUp();
      expect(typeof followUp).toBe('string');
      expect(followUp.length).toBeGreaterThan(0);
      expect(followUp.includes('?')).toBe(true);
    });

    test('should return different follow-ups', () => {
      const followUps = new Set();
      for (let i = 0; i < 10; i++) {
        followUps.add(generateFollowUp());
      }
      expect(followUps.size).toBeGreaterThan(1);
    });
  });

  describe('Session Scoring', () => {
    test('should handle empty answers', () => {
      const summary = scoreSession([]);
      expect(summary.total_questions).toBe(0);
      expect(summary.avg_score).toBe(0);
      expect(summary.dimension_averages.relevance).toBe(0);
    });

    test('should calculate session summary', () => {
      const answers = [
        {
          duration_seconds: 40,
          scores: {
            relevance: 20,
            depth: 18,
            structure: 19,
            communication: 22,
            total: 79
          }
        },
        {
          duration_seconds: 50,
          scores: {
            relevance: 22,
            depth: 20,
            structure: 20,
            communication: 23,
            total: 85
          }
        }
      ];

      const summary = scoreSession(answers);
      expect(summary.total_questions).toBe(2);
      expect(summary.avg_score).toBe(82);
      expect(summary.avg_duration).toBe(45);
    });

    test('should calculate dimension averages', () => {
      const answers = [
        {
          duration_seconds: 30,
          scores: {
            relevance: 20,
            depth: 20,
            structure: 20,
            communication: 20,
            total: 80
          }
        },
        {
          duration_seconds: 30,
          scores: {
            relevance: 24,
            depth: 24,
            structure: 24,
            communication: 24,
            total: 96
          }
        }
      ];

      const summary = scoreSession(answers);
      expect(summary.dimension_averages.relevance).toBe(22);
      expect(summary.dimension_averages.depth).toBe(22);
      expect(summary.dimension_averages.structure).toBe(22);
      expect(summary.dimension_averages.communication).toBe(22);
    });

    test('should ignore null scores in averages', () => {
      const answers = [
        {
          duration_seconds: 30,
          scores: {
            relevance: 20,
            depth: 20,
            structure: 20,
            communication: 20,
            total: 80
          }
        },
        {
          duration_seconds: 30,
          scores: {
            relevance: null,
            depth: null,
            structure: null,
            communication: null,
            total: null
          }
        }
      ];

      const summary = scoreSession(answers);
      expect(summary.avg_score).toBe(40); // Only first answer counted
    });

    test('should round values appropriately', () => {
      const answers = [
        {
          duration_seconds: 33,
          scores: {
            relevance: 15,
            depth: 14,
            structure: 16,
            communication: 15,
            total: 60
          }
        }
      ];

      const summary = scoreSession(answers);
      expect(typeof summary.avg_score).toBe('number');
      expect(typeof summary.avg_duration).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long transcripts', () => {
      const longTranscript = 'word '.repeat(1000);
      const answer = {
        transcript: longTranscript,
        duration_seconds: 150,
        confidence: 0.9,
        phase: 2
      };

      const evaluation = evaluateAnswer(answer);
      expect(evaluation.total).toBeGreaterThan(0);
    });

    test('should handle empty transcript with sufficient duration', () => {
      const answer = {
        transcript: '',
        duration_seconds: 10,
        confidence: 0.9,
        phase: 2
      };

      const evaluation = evaluateAnswer(answer);
      expect(evaluation.flag).toBeNull(); // No flag, just low scores
      expect(evaluation.relevance).toBe(10);
    });

    test('should handle exactly threshold confidence', () => {
      const answer = {
        transcript: 'valid answer text',
        duration_seconds: 20,
        confidence: 0.45,
        phase: 2
      };

      const evaluation = evaluateAnswer(answer);
      expect(evaluation.total).toBeGreaterThan(0);
      expect(evaluation.flag).toBeNull();
    });

    test('should handle exactly threshold duration', () => {
      const answer = {
        transcript: 'valid answer with enough text to exceed minimum',
        duration_seconds: 4,
        confidence: 0.9,
        phase: 2
      };

      const evaluation = evaluateAnswer(answer);
      expect(evaluation.total).toBeGreaterThan(0);
      expect(evaluation.flag).toBeNull();
    });
  });
});
