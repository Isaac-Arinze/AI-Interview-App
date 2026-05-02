const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readConfig } = require('../config');

const projectRoot = path.join(__dirname, '..', '..');

function dataRoot() {
  return process.env.TTS_DATA_ROOT ? path.resolve(process.env.TTS_DATA_ROOT) : projectRoot;
}

function jobsDir() {
  return path.join(dataRoot(), 'data', 'jobs');
}

/**
 * Queue a background job (no-op unless USE_QUEUE=1).
 * @param {string} type
 * @param {object} [payload]
 */
function enqueue(type, payload = {}) {
  const cfg = readConfig();
  if (!cfg.useQueue) return;

  const dir = jobsDir();
  fs.mkdirSync(dir, { recursive: true });
  const job = {
    id: uuidv4(),
    type,
    payload,
    created_at: new Date().toISOString()
  };
  const tmp = path.join(dir, `${job.id}.tmp`);
  const fp = path.join(dir, `${job.id}.json`);
  fs.writeFileSync(tmp, JSON.stringify(job), 'utf8');
  fs.renameSync(tmp, fp);
}

module.exports = {
  enqueue,
  jobsDir
};
