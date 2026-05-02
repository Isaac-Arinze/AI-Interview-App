/**
 * Optional OpenAI Whisper transcription for answer audio (multipart upload).
 * Used when OPENAI_API_KEY is set and the client sends answer_audio_base64 on submit-answer.
 */
const FormData = require('form-data');

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 1024;

function extensionForMime(mimeType) {
  const base = String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (base.includes('webm')) return 'webm';
  if (base.includes('mp4')) return 'm4a';
  if (base.includes('mpeg') || base === 'audio/mp3') return 'mp3';
  if (base.includes('wav')) return 'wav';
  return 'webm';
}

function isAllowedAudioMime(mimeType) {
  const base = String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!base.startsWith('audio/')) return false;
  const allowed = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav'];
  return allowed.includes(base);
}

/**
 * @param {{ buffer: Buffer, mimeType?: string }} opts
 * @returns {Promise<{ text: string, source: 'openai_whisper' } | null>}
 */
async function transcribeAnswerAudio(opts) {
  const key = process.env.OPENAI_API_KEY;
  const { buffer, mimeType = 'audio/webm' } = opts || {};
  if (!key || !Buffer.isBuffer(buffer) || buffer.length < 32 || buffer.length > MAX_AUDIO_BYTES) {
    return null;
  }
  const cleanMime = String(mimeType || 'audio/webm').split(';')[0].trim();
  if (!isAllowedAudioMime(cleanMime) && !String(mimeType || '').toLowerCase().startsWith('audio/webm')) {
    return null;
  }

  const fetchFn = typeof global.fetch === 'function' ? global.fetch.bind(global) : require('node-fetch');
  const form = new FormData();
  const ext = extensionForMime(mimeType);
  form.append('file', buffer, {
    filename: `answer.${ext}`,
    contentType: cleanMime || 'audio/webm'
  });
  form.append('model', process.env.OPENAI_STT_MODEL || 'whisper-1');
  const lang = process.env.OPENAI_STT_LANGUAGE;
  if (lang && /^[a-z]{2}(-[A-Z]{2})?$/.test(lang)) {
    form.append('language', lang);
  }

  const res = await fetchFn('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      ...form.getHeaders()
    },
    body: form
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.warn('[stt] OpenAI transcription failed:', res.status, txt.slice(0, 240));
    return null;
  }

  const data = await res.json().catch(() => ({}));
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (!text) return null;
  return { text, source: 'openai_whisper' };
}

module.exports = {
  transcribeAnswerAudio,
  MAX_AUDIO_BYTES,
  MAX_BASE64_CHARS,
  isAllowedAudioMime
};
