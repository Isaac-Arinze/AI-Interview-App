const fs = require('fs');
const path = require('path');
const os = require('os');

describe('enqueue', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('does nothing when USE_QUEUE is off', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-nq-'));
    process.env.TTS_DATA_ROOT = root;
    delete process.env.USE_QUEUE;
    jest.resetModules();
    const { enqueue, jobsDir } = require('../../src/jobs/enqueue');
    enqueue('TEST', { a: 1 });
    expect(fs.existsSync(jobsDir())).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('writes a job file when USE_QUEUE=1', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-job-'));
    process.env.TTS_DATA_ROOT = root;
    process.env.USE_QUEUE = '1';
    jest.resetModules();
    const { enqueue, jobsDir } = require('../../src/jobs/enqueue');
    enqueue('ANSWER_SUBMITTED', { session_id: 's1', question_index: 2 });
    const files = fs.readdirSync(jobsDir()).filter((f) => f.endsWith('.json'));
    expect(files.length).toBe(1);
    const job = JSON.parse(fs.readFileSync(path.join(jobsDir(), files[0]), 'utf8'));
    expect(job.type).toBe('ANSWER_SUBMITTED');
    expect(job.payload.session_id).toBe('s1');
    expect(job.payload.question_index).toBe(2);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
