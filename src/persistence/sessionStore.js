/**
 * Session store: in-memory Map with optional JSON file persistence (USE_DB=1).
 * Survives process restarts when persistence is on; swap for PostgreSQL later.
 */
const fs = require('fs');
const path = require('path');
const ARIASession = require('../aria/session');

/**
 * @param {{ persistToDisk?: boolean, dataDir?: string }} opts
 */
function createSessionStore(opts = {}) {
  const persistToDisk = Boolean(opts.persistToDisk);
  const dataDir = opts.dataDir || path.join(process.cwd(), 'data', 'sessions');

  const map = new Map();

  function filePath(id) {
    return path.join(dataDir, `${id}.json`);
  }

  function writeSnapshot(session) {
    if (!persistToDisk) return;
    const id = session.session_id;
    const tmp = filePath(id) + '.tmp';
    const body = JSON.stringify(session.toJSON(), null, 0);
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(tmp, body, 'utf8');
    fs.renameSync(tmp, filePath(id));
  }

  function readSnapshot(id) {
    const fp = filePath(id);
    if (!fs.existsSync(fp)) return null;
    try {
      const raw = fs.readFileSync(fp, 'utf8');
      const data = JSON.parse(raw);
      return ARIASession.deserialize(data);
    } catch {
      return null;
    }
  }

  function unlinkSnapshot(id) {
    if (!persistToDisk) return;
    const fp = filePath(id);
    try {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch {
      /* ignore */
    }
  }

  return {
    dataDir,
    persistToDisk,

    get(id) {
      if (map.has(id)) return map.get(id);
      if (!persistToDisk) return undefined;
      const loaded = readSnapshot(id);
      if (loaded) map.set(id, loaded);
      return loaded;
    },

    set(id, session) {
      map.set(id, session);
      writeSnapshot(session);
      return this;
    },

    has(id) {
      if (map.has(id)) return true;
      if (!persistToDisk) return false;
      return fs.existsSync(filePath(id));
    },

    delete(id) {
      const existedInMap = map.delete(id);
      let hadFile = false;
      if (persistToDisk) {
        hadFile = fs.existsSync(filePath(id));
        unlinkSnapshot(id);
      }
      return existedInMap || hadFile;
    },

    /** Call after in-place mutations (answers, video, etc.). */
    persist(session) {
      if (!session || !session.session_id) return;
      map.set(session.session_id, session);
      writeSnapshot(session);
    }
  };
}

module.exports = {
  createSessionStore
};
