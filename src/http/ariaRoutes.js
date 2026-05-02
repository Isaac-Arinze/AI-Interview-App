/**
 * ARIA interview HTTP routes — extracted from server.js for safer evolution
 * (DB, queues, v2 APIs) without growing a monolithic server file.
 */
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { enqueue } = require('../jobs/enqueue');
const { readConfig } = require('../config');
const ARIASession = require('../aria/session');
const QuestionBank = require('../aria/questionBank');
const StateTransitions = require('../aria/stateTransitions');
const Evaluator = require('../aria/evaluator');
const { maybeInsertAdaptiveFollowup } = require('../aria/adaptiveFollowup');
const { deriveConfidenceFromSignals } = require('../aria/answerSignals');
const { buildInterviewReportStub } = require('../aria/interviewReportStub');
const {
  transcribeAnswerAudio,
  MAX_BASE64_CHARS
} = require('../aria/sttService');

/**
 * Mount ARIA interview and session-video routes on `app`.
 * @param {import('express').Application} app
 * @param {{ sessions: Map<string, unknown>, uploadsDir: string }} ctx
 */
function registerAriaRoutes(app, ctx) {
  const { sessions, uploadsDir } = ctx;

  function persistSession(session) {
    if (session && typeof sessions.persist === 'function') {
      sessions.persist(session);
    }
  }

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

  app.post('/api/aria/submit-answer', async (req, res) => {
    try {
      const { session_id, duration_seconds, confidence } = req.body;
      if (!session_id || !sessions.has(session_id)) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const session = sessions.get(session_id);

      let transcript =
        typeof req.body.transcript === 'string' ? req.body.transcript.trim() : '';
      let transcriptSource = 'client';

      const audioB64 = req.body.answer_audio_base64;
      const audioMime =
        typeof req.body.answer_audio_mime === 'string' ? req.body.answer_audio_mime : 'audio/webm';
      if (
        process.env.OPENAI_API_KEY &&
        typeof audioB64 === 'string' &&
        audioB64.length > 80 &&
        audioB64.length <= MAX_BASE64_CHARS
      ) {
        try {
          const buf = Buffer.from(audioB64, 'base64');
          const stt = await transcribeAnswerAudio({ buffer: buf, mimeType: audioMime });
          if (stt && stt.text) {
            transcript = stt.text;
            transcriptSource = stt.source;
          }
        } catch (e) {
          console.warn('[stt] transcribe skipped:', e.message);
        }
      }

      const cfg = readConfig();
      const clientConf = parseFloat(confidence);
      let effectiveConfidence = Number.isFinite(clientConf) ? clientConf : 0.85;
      let confidenceSource = 'client';
      if (cfg.trustServerStt) {
        const derived = deriveConfidenceFromSignals({
          transcript,
          duration_seconds,
          client_confidence: clientConf
        });
        effectiveConfidence = derived.confidence;
        confidenceSource = derived.source;
      }

      session.recordAnswer(transcript, effectiveConfidence, parseFloat(duration_seconds), []);

      if (!Array.isArray(session.questions) || session.questions.length === 0) {
        session.questions = QuestionBank.getInterviewQuestions(session.candidate.role);
      }
      const questions = session.questions;
      const currentQuestion = questions[session.question_index];

      const evaluation = Evaluator.evaluateAnswer({
        transcript,
        duration_seconds: parseFloat(duration_seconds),
        confidence: effectiveConfidence,
        phase: currentQuestion?.phase || Math.ceil((session.question_index + 1) / 2),
        type: currentQuestion?.type || 'standard'
      });

      session.updateLastAnswerScores({
        relevance: evaluation.relevance,
        depth: evaluation.depth,
        structure: evaluation.structure,
        communication: evaluation.communication
      });

      const willRetry =
        evaluation.flag &&
        ['LOW_CONFIDENCE', 'ANSWER_TOO_SHORT'].includes(evaluation.flag) &&
        !session.isMaxRetriesExceeded();

      let adaptiveInserted = false;
      if (!willRetry && cfg.adaptiveFollowups) {
        adaptiveInserted = maybeInsertAdaptiveFollowup({
          session,
          questions,
          evaluation,
          currentQuestion,
          enabled: true
        }).inserted;
      }

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

      persistSession(session);

      enqueue('ANSWER_SUBMITTED', {
        session_id,
        question_index: session.question_index,
        next_action: nextAction,
        score_total: evaluation.total
      });

      res.json({
        success: true,
        evaluation,
        acknowledgment,
        next_action: nextAction,
        adaptive_inserted: adaptiveInserted,
        confidence_used: effectiveConfidence,
        confidence_source: confidenceSource,
        transcript_source: transcriptSource,
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

      if (!Array.isArray(session.questions) || session.questions.length === 0) {
        session.questions = QuestionBank.getInterviewQuestions(session.candidate.role);
      }
      const questions = session.questions;
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

      const body = {
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
      };

      const wantReport =
        req.query.include_report === '1' ||
        req.query.include_report === 'true' ||
        req.query.enriched === '1';
      if (wantReport) {
        body.report = buildInterviewReportStub(session, summary);
      }

      res.json(body);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Append client proctoring / telemetry events (non-blocking for the interview UX).
   * Body: { events: [{ type, ts?, detail? }] } or a single event object with `type`.
   */
  app.post('/api/aria/session/:id/events', (req, res) => {
    try {
      const session = sessions.get(req.params.id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      if (!Array.isArray(session.proctor_events)) {
        session.proctor_events = [];
      }
      const MAX_EVENTS = 200;
      const MAX_BATCH = 40;
      const body = req.body || {};
      let incoming = [];
      if (Array.isArray(body.events)) {
        incoming = body.events;
      } else if (body && typeof body.type === 'string') {
        incoming = [body];
      }
      let accepted = 0;
      for (const ev of incoming.slice(0, MAX_BATCH)) {
        if (!ev || typeof ev.type !== 'string') continue;
        const type = String(ev.type).slice(0, 64);
        let detail = ev.detail;
        if (detail != null && typeof detail === 'object') {
          try {
            const s = JSON.stringify(detail);
            if (s.length > 2000) detail = { _truncated: true };
          } catch {
            detail = undefined;
          }
        } else {
          detail = undefined;
        }
        session.proctor_events.push({
          type,
          ts: typeof ev.ts === 'string' ? ev.ts.slice(0, 40) : new Date().toISOString(),
          detail
        });
        accepted += 1;
      }
      if (session.proctor_events.length > MAX_EVENTS) {
        session.proctor_events = session.proctor_events.slice(-MAX_EVENTS);
      }
      persistSession(session);
      res.json({ success: true, accepted, total: session.proctor_events.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /** Last proctor events for dashboards / review (optional). */
  app.get('/api/aria/session/:id/proctor', (req, res) => {
    try {
      const session = sessions.get(req.params.id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      const list = Array.isArray(session.proctor_events) ? session.proctor_events : [];
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
      res.json({
        success: true,
        session_id: session.session_id,
        events: list.slice(-limit),
        total: list.length
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

      persistSession(session);

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
