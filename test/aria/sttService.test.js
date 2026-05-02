const { transcribeAnswerAudio, MAX_BASE64_CHARS, isAllowedAudioMime } = require('../../src/aria/sttService');

describe('transcribeAnswerAudio', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it('returns null when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const r = await transcribeAnswerAudio({ buffer: Buffer.alloc(200, 7) });
    expect(r).toBeNull();
  });

  it('returns null when buffer is too small', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const r = await transcribeAnswerAudio({ buffer: Buffer.alloc(10, 1) });
    expect(r).toBeNull();
  });

  it('returns null when buffer exceeds max size', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const r = await transcribeAnswerAudio({
      buffer: Buffer.alloc(30 * 1024 * 1024, 1)
    });
    expect(r).toBeNull();
  });
});

describe('sttService mime helpers', () => {
  it('accepts common audio types', () => {
    expect(isAllowedAudioMime('audio/webm')).toBe(true);
    expect(isAllowedAudioMime('audio/webm;codecs=opus')).toBe(true);
    expect(isAllowedAudioMime('audio/mp4')).toBe(true);
    expect(isAllowedAudioMime('video/webm')).toBe(false);
  });

  it('exports a sane base64 cap', () => {
    expect(MAX_BASE64_CHARS).toBeGreaterThan(1e6);
  });
});
