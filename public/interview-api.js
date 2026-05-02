/**
 * Thin ARIA interview HTTP client — keeps fetch URLs and JSON shapes in one place.
 * Loaded before the inline app script in index.html.
 */
(function (global) {
  const JSON_HDR = { 'Content-Type': 'application/json' };

  async function initSession(payload) {
    const res = await fetch('/api/aria/session/init', {
      method: 'POST',
      headers: JSON_HDR,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to init session');
    return res.json();
  }

  async function submitAnswer(payload) {
    const res = await fetch('/api/aria/submit-answer', {
      method: 'POST',
      headers: JSON_HDR,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to submit answer');
    return res.json();
  }

  async function getSession(sessionId) {
    const res = await fetch('/api/aria/session/' + encodeURIComponent(sessionId));
    if (!res.ok) throw new Error('Session lookup failed');
    return res.json();
  }

  /**
   * @param {string} sessionId
   * @param {{ includeReport?: boolean }} [opts]
   */
  async function getSummary(sessionId, opts) {
    const q =
      opts && opts.includeReport ? '?include_report=1' : '';
    const res = await fetch(
      '/api/aria/session/' + encodeURIComponent(sessionId) + '/summary' + q
    );
    if (!res.ok) throw new Error('Summary fetch failed');
    return res.json();
  }

  async function postProctorEvents(sessionId, events) {
    if (!Array.isArray(events) || events.length === 0) return { success: true, accepted: 0 };
    const res = await fetch(
      '/api/aria/session/' + encodeURIComponent(sessionId) + '/events',
      {
        method: 'POST',
        headers: JSON_HDR,
        body: JSON.stringify({ events })
      }
    );
    if (!res.ok) return { success: false, accepted: 0 };
    return res.json();
  }

  /**
   * @param {string} sessionId
   * @param {{ limit?: number }} [opts] — server clamps to 1–100, default 50
   */
  async function getProctorEvents(sessionId, opts) {
    let q = '';
    if (opts && opts.limit != null) {
      const n = Number(opts.limit);
      if (Number.isFinite(n)) {
        q = '?limit=' + encodeURIComponent(String(Math.floor(n)));
      }
    }
    const res = await fetch(
      '/api/aria/session/' + encodeURIComponent(sessionId) + '/proctor' + q
    );
    if (!res.ok) throw new Error('Proctor events fetch failed');
    return res.json();
  }

  async function deleteSession(sessionId) {
    const res = await fetch('/api/aria/session/' + encodeURIComponent(sessionId), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Session delete failed');
    return res.json();
  }

  async function uploadSessionVideo(sessionId, videoBase64) {
    const res = await fetch(
      '/api/aria/session/' + encodeURIComponent(sessionId) + '/video/upload',
      {
        method: 'POST',
        headers: JSON_HDR,
        body: JSON.stringify({
          video_data: videoBase64,
          session_id: sessionId
        })
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Upload failed');
    }
    return res.json();
  }

  global.AriaInterviewApi = {
    initSession,
    submitAnswer,
    getSession,
    getSummary,
    postProctorEvents,
    getProctorEvents,
    deleteSession,
    uploadSessionVideo
  };
})(typeof window !== 'undefined' ? window : globalThis);
