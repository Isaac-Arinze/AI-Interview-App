/**
 * Stub worker: moves JSON job files from data/jobs/ to data/jobs/processed/
 * after logging. Replace with Redis consumer + LLM / analytics later.
 */
const fs = require('fs');
const path = require('path');
const { jobsDir } = require('./enqueue');

function processedDir() {
  return path.join(jobsDir(), 'processed');
}

function main() {
  const pending = jobsDir();
  if (!fs.existsSync(pending)) {
    console.log('[worker] no jobs directory yet');
    process.exit(0);
  }

  fs.mkdirSync(processedDir(), { recursive: true });

  const names = fs
    .readdirSync(pending)
    .filter((f) => f.endsWith('.json') && !f.startsWith('.'));

  if (names.length === 0) {
    console.log('[worker] no pending jobs');
    process.exit(0);
  }

  for (const name of names) {
    const fp = path.join(pending, name);
    let job;
    try {
      job = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (e) {
      console.error('[worker] skip invalid file', name, e.message);
      continue;
    }
    console.log('[worker] stub', job.type, job.id, JSON.stringify(job.payload));
    const dest = path.join(processedDir(), name);
    try {
      fs.renameSync(fp, dest);
    } catch (e) {
      console.error('[worker] failed to move', name, e.message);
    }
  }

  process.exit(0);
}

main();
