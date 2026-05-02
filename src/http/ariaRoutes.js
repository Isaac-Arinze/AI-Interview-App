/**
 * ARIA interview HTTP routes — extracted from server.js for safer evolution
 * (DB, queues, v2 APIs) without growing a monolithic server file.
 */
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const ARIASession = require('../aria/session');
const QuestionBank = require('../aria/questionBank');
const StateTransitions = require('../aria/stateTransitions');
const Evaluator = require('../aria/evaluator');

/**
 * Mount ARIA interview and session-video routes on `app`.
 * @param {import('express').Application} app
 * @param {{ sessions: Map<string, unknown>, uploadsDir: string }} ctx
 */
function registerAriaRoutes(app, ctx) {
  const { sessions, uploadsDir } = ctx;

  async function fetchRoleQuestionsFromAPI(role) {
    const url = process.env.QUESTION_API_URL;
    if (!url) return null;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (process.env.QUESTION_API_KEY) {
        headers.Authorization = 'Bearer ' + process.env.QUESTION_API_KEY;
      }
      let response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role })
      });
      if (!response.ok) {
        response = await fetch(
          url.includes('?') ? `${url}&role=${encodeURIComponent(role)}` : `${url}?role=${encodeURIComponent(role)}`
        );
      }
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      const items = data.slice(0, 3);
      const questions = items
        .map((q, idx) => {
          const text = typeof q === 'string' ? q : q?.text || '';
          return {
            question_index: 8 + idx,
            text,
            phase: 4,
            type: 'role-specific',
            role,
            expected_duration_range: [40, 100]
          };
        })
        .filter((q) => q.text && q.text.trim().length > 0);
      if (questions.length === 0) return null;
      while (questions.length < 3) {
        const fallback = (idx) => ({
          question_index: 8 + idx,
          text: `Describe your experience relevant to ${role}.`,
          phase: 4,
          type: 'role-specific',
          role,
          expected_duration_range: [40, 100]
        });
        questions.push(fallback(questions.length));
      }
      return questions;
    } catch {
      return null;
    }
  }

  app.post('/api/aria/session/init', async (req, res) => {
    try {
      const {
        name = 'Candidate',
        role = 'Unspecified',
        language = 'en-US',
        short_interview = false
      } = req.body;
      const isShortInterview = short_interview === true || short_interview === 'true';

      const session = new ARIASession(null, { name, role, language });
      sessions.set(session.session_id, session);

      const baseQuestions = QuestionBank.buildTailoredBaseQuestions(role);
      let roleSpecific = await fetchRoleQuestionsFromAPI(role);
      if (!roleSpecific) {
        roleSpecific = QuestionBank.generateRoleSpecificQuestions(role, 8);
      } else {
        roleSpecific = roleSpecific
          .map((q, idx) => ({
            ...q,
            question_index: 8 + idx,
            phase: 4,
            type: 'role-specific',
            role
          }))
          .slice(0, 3);
      }
      const useRole = role && role !== 'Unspecified';
      const candidateQA = QuestionBank.questionBank.phase5_candidateQA.map((q) => ({
        ...q,
        text: useRole ? `Do you have any questions for us about this ${role} role or the team?` : q.text
      }));
      candidateQA[0].question_index = 11;
      let questions = [...baseQuestions, ...roleSpecific, ...candidateQA];
      if (isShortInterview) {
        questions = QuestionBank.takeFirstNInterviewQuestions(questions, 2);
      }
      session.questions = questions;
      const firstQuestion = questions[0];

      res.json({
        success: true,
        session_id: session.session_id,
        candidate: session.candidate,
        interview_mode: isShortInterview ? 'short' : 'full',
        total_questions: questions.length,
        current_question: {
          index: 0,
          text: firstQuestion.text,
          phase: firstQuestion.phase,
          type: firstQuestion.type,
          expected_duration: firstQuestion.expected_duration_range
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/aria/submit-answer', (req, res) => {
    try {
      const { session_id, transcript, duration_seconds, confidence } = req.body;
      if (!session_id || !sessions.has(session_id)) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const session = sessions.get(session_id);

      session.recordAnswer(transcript, parseFloat(confidence), parseFloat(duration_seconds), []);

      const questions =
        Array.isArray(session.questions) && session.questions.length > 0
          ? session.questions
          : QuestionBank.getInterviewQuestions(session.candidate.role);
      const currentQuestion = questions[session.question_index];

      const evaluation = Evaluator.evaluateAnswer({
        transcript,
        duration_seconds: parseFloat(duration_seconds),
        confidence: parseFloat(confidence),
        phase: currentQuestion?.phase || Math.ceil((session.question_index + 1) / 2),
        type: currentQuestion?.type || 'standard'
      });

      session.updateLastAnswerScores({
        relevance: evaluation.relevance,
        depth: evaluation.depth,
        structure: evaluation.structure,
        communication: evaluation.communication
      });

      const nextState = StateTransitions.getNextStateAfterEvaluation(session, evaluation, questions.length);
      const acknowledgment = Evaluator.getAcknowledgmentPhrase(evaluation.total || 50);

      let nextAction = 'NEXT_QUESTION';
      if (nextState === 'PROMPT_RETRY') {
        session.incrementRetry();
        nextAction = 'RETRY_QUESTION';
      } else if (nextState === 'CLOSING') {
        nextAction = 'SHOW_SUMMARY';
      } else {
        session.nextQuestion();
        nextAction = 'NEXT_QUESTION';
      }

      res.json({
        success: true,
        evaluation,
        acknowledgment,
        next_action: nextAction,
        session_state: {
          question_index: session.question_index,
          current_retry_count: session.current_retry_count,
          max_retries: session.max_retries
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/aria/session/:id', (req, res) => {
    try {
      const session = sessions.get(req.params.id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const questions =
        Array.isArray(session.questions) && session.questions.length > 0
          ? session.questions
          : QuestionBank.getInterviewQuestions(session.candidate.role);
      const currentQuestion = questions[session.question_index] || null;

      res.json({
        success: true,
        session_id: session.session_id,
        candidate: session.candidate,
        state: session.state,
        question_index: session.question_index,
        total_questions: questions.length,
        current_question: currentQuestion
          ? {
              index: session.question_index,
              text: currentQuestion.text,
              phase: currentQuestion.phase,
              type: currentQuestion.type
            }
          : null,
        retry_count: session.current_retry_count,
        max_retries: session.max_retries,
        is_expired: session.isExpired()
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/aria/session/:id/summary', (req, res) => {
    try {
      const session = sessions.get(req.params.id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const answers = session.answers;
      const summary = Evaluator.scoreSession(answers);

      res.json({
        success: true,
        session_id: session.session_id,
        candidate: session.candidate,
        interview_summary: session.getSummary(),
        scoring: summary,
        answers: answers.map((a) => ({
          question_index: a.question_index,
          transcript: a.transcript,
          duration: a.duration_seconds,
          confidence: a.confidence,
          scores: a.scores
        }))
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/aria/session/:id', (req, res) => {
    const deleted = sessions.delete(req.params.id);
    res.json({
      success: true,
      deleted
    });
  });

  app.post('/api/aria/session/:id/video/upload', (req, res) => {
    try {
      const sessionId = req.params.id;
      const session = sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { video_data } = req.body;

      if (!video_data) {
        return res.status(400).json({ error: 'No video data provided' });
      }

      const buffer = Buffer.from(video_data, 'base64');
      const videoFileName = `${sessionId}_interview.webm`;
      const videoPath = path.join(uploadsDir, videoFileName);

      fs.writeFileSync(videoPath, buffer);

      const stats = fs.statSync(videoPath);
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

      session.video_url = `/videos/${videoFileName}`;
      session.video_size_mb = parseFloat(fileSizeMB);
      session.video_uploaded_at = new Date().toISOString();

      console.log(`✓ Video uploaded for session ${sessionId}: ${fileSizeMB} MB`);

      res.json({
        success: true,
        video_url: session.video_url,
        size_mb: fileSizeMB,
        uploaded_at: session.video_uploaded_at
      });
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({ error: 'Video upload failed: ' + error.message });
    }
  });

  app.get('/videos/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      if (!/^[a-f0-9\-_.]+\.webm$/i.test(filename)) {
        return res.status(400).json({ error: 'Invalid filename' });
      }

      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'video/webm',
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes'
      });

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    } catch (error) {
      console.error('Video retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve video' });
    }
  });
}

module.exports = {
  registerAriaRoutes
};
