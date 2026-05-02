const fs = require('fs');
const path = require('path');
const os = require('os');
const ARIASession = require('../../src/aria/session');
const { createSessionStore } = require('../../src/persistence/sessionStore');

describe('createSessionStore', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-sess-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('behaves like a Map when persistToDisk is false', () => {
    const store = createSessionStore({ persistToDisk: false, dataDir: tmpDir });
    const s = new ARIASession(null, { name: 'A', role: 'X' });
    expect(store.has(s.session_id)).toBe(false);
    store.set(s.session_id, s);
    expect(store.has(s.session_id)).toBe(true);
    expect(store.get(s.session_id)).toBe(s);
    expect(store.delete(s.session_id)).toBe(true);
    expect(store.has(s.session_id)).toBe(false);
    expect(fs.readdirSync(tmpDir).length).toBe(0);
  });

  it('writes and reloads session across store instances', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const s = new ARIASession(id, { name: 'B', role: 'Engineer' });
    s.questions = [{ question_index: 0, text: 'Q?', phase: 1, type: 'warmup' }];
    s.recordAnswer('hello world', 0.9, 12);

    const store1 = createSessionStore({ persistToDisk: true, dataDir: tmpDir });
    store1.set(id, s);

    const store2 = createSessionStore({ persistToDisk: true, dataDir: tmpDir });
    expect(store2.has(id)).toBe(true);
    const loaded = store2.get(id);
    expect(loaded.session_id).toBe(id);
    expect(loaded.answers).toHaveLength(1);
    expect(loaded.answers[0].transcript).toBe('hello world');
    expect(loaded.questions).toHaveLength(1);
  });

  it('persist() updates snapshot after mutations', () => {
    const store = createSessionStore({ persistToDisk: true, dataDir: tmpDir });
    const s = new ARIASession(null, { name: 'C', role: 'Y' });
    store.set(s.session_id, s);
    s.recordAnswer('one', 0.8, 10);
    store.persist(s);

    const store2 = createSessionStore({ persistToDisk: true, dataDir: tmpDir });
    const loaded = store2.get(s.session_id);
    expect(loaded.answers).toHaveLength(1);
  });
});
