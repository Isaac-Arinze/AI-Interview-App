
(function (global) {
  const MP_VERSION = '0.10.14';
  const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
  const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

  let faceLandmarker = null;
  let rafId = null;
  let aborted = false;

  function abort() {
    aborted = true;
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    try {
      if (faceLandmarker && faceLandmarker.close) faceLandmarker.close();
    } catch (e) {}
    faceLandmarker = null;
  }

  function speak(text, opts = {}) {
    const s = global.speechSynthesis;
    if (!s || !text) return Promise.resolve();
    return new Promise((resolve) => {
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts.lang || 'en-US';
      u.rate = opts.rate != null ? opts.rate : 0.92;
      u.pitch = opts.pitch != null ? opts.pitch : 1;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      s.speak(u);
    });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getBlend(categories, ...names) {
    if (!categories || !categories.length) return 0;
    let best = 0;
    for (const n of names) {
      const c = categories.find(
        (x) => x.categoryName === n || x.displayName === n || x.categoryName?.includes(n)
      );
      if (c && c.score > best) best = c.score;
    }
    return best;
  }

  function noseXY(landmarks) {
    if (!landmarks || !landmarks.length) return null;
    const tip = landmarks[1] || landmarks[4];
    return tip ? { x: tip.x, y: tip.y } : null;
  }

  async function loadLandmarker() {
    const mod = await import(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/+esm`
    );
    const fileset = await mod.FilesetResolver.forVisionTasks(WASM_BASE);
    const tryCreate = async (delegate) =>
      mod.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    try {
      return await tryCreate('GPU');
    } catch (e) {
      return await tryCreate('CPU');
    }
  }

  function buildDefaultSteps() {
    const blink = {
      id: 'blink',
      label: 'Blink your eyes',
      intro: 'Please blink your eyes slowly two or three times.',
      success: 'Nice. Blink detected.',
      detect: (ctx) => {
        const b = getBlend(ctx.blendCats, 'eyeBlinkLeft', 'eyeBlinkRight');
        return b > 0.42;
      }
    };
    const smile = {
      id: 'smile',
      label: 'Smile',
      intro: 'Please give a clear smile.',
      success: 'Great. Smile detected.',
      detect: (ctx) => {
        return getBlend(ctx.blendCats, 'mouthSmileLeft', 'mouthSmileRight', 'mouthSmile') > 0.38;
      }
    };
    const turnLeft = {
      id: 'turnLeft',
      label: 'Turn head left',
      intro: 'Turn your head slowly toward your left shoulder, then back.',
      success: 'Good. Left turn seen.',
      detect: (ctx) => {
        if (ctx.baselineTurnX == null || ctx.nose == null) return false;
        // Unmirrored video: user’s left → nose tip shifts toward +x
        return ctx.nose.x > ctx.baselineTurnX + 0.04;
      }
    };
    const turnRight = {
      id: 'turnRight',
      label: 'Turn head right',
      intro: 'Now turn your head slowly toward your right shoulder.',
      success: 'Perfect. Right turn seen.',
      detect: (ctx) => {
        if (ctx.baselineTurnX == null || ctx.nose == null) return false;
        return ctx.nose.x < ctx.baselineTurnX - 0.04;
      }
    };
    // Always include both head turns, blink, and smile; order shuffled for replay variance.
    const picked = shuffle([turnLeft, turnRight, blink, smile]);
    const steps = [
      {
        id: 'align',
        label: 'Position your face',
        intro: 'Position your face inside the circle and look straight at the camera.',
        success: 'Face aligned. Thank you.',
        detect: (ctx) => {
          if (!ctx.nose) return false;
          const cx = ctx.nose.x;
          const cy = ctx.nose.y;
          return cx > 0.38 && cx < 0.62 && cy > 0.35 && cy < 0.68;
        }
      },
      ...picked
    ];
    return steps;
  }

  function renderChecklist(ul, steps, activeIndex, doneSet) {
    ul.innerHTML = steps
      .map((s, i) => {
        const done = doneSet.has(s.id);
        const active = i === activeIndex && !done;
        const cls = done ? 'liveness-check done' : active ? 'liveness-check active' : 'liveness-check';
        const mark = done ? '✔ ' : '';
        return `<li class="${cls}">${mark}${s.label}</li>`;
      })
      .join('');
  }

  function setRing(el, state) {
    if (!el) return;
    el.classList.remove('liveness-ring--warn', 'liveness-ring--ok', 'liveness-ring--idle');
    el.classList.add('liveness-ring--' + (state || 'idle'));
  }

  /**
   * @param {object} options
   * @param {HTMLVideoElement} options.video
   * @param {HTMLElement} options.checklistEl
   * @param {HTMLElement} options.ringEl
   * @param {HTMLElement} options.captionEl
   * @param {HTMLElement} [options.statusEl]
   * @returns {Promise<{mode:'done'}|{mode:'fallback',error?:any}>}
   */
  async function run(options) {
    const { video, checklistEl, ringEl, captionEl, statusEl } = options;
    aborted = false;
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Loading face engine…';
    }
    let landmarker;
    try {
      landmarker = await loadLandmarker();
      faceLandmarker = landmarker;
    } catch (e) {
      if (statusEl) statusEl.style.display = 'none';
      return { mode: 'fallback', error: e };
    }
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.style.display = 'none';
    }

    const steps = buildDefaultSteps();
    const done = new Set();
    let stepIndex = 0;
    let hold = 0;
    /** Nose x at the moment we advance into the current step (for head-turn deltas). */
    let baselineTurnX = null;
    let lastRepeat = 0;
    const STEP_TIMEOUT_MS = 14000;
    const HOLD_MS = 380;
    let stepStart = performance.now();

    renderChecklist(checklistEl, steps, stepIndex, done);

    await speak('We will verify your presence with a few quick steps.', { rate: 0.93 });
    await new Promise((r) => setTimeout(r, 400));
    await speak(steps[0].intro);

    return new Promise((resolve) => {
      const loop = (ts) => {
        if (aborted) {
          resolve({ mode: 'fallback', error: new Error('aborted') });
          return;
        }
        if (!faceLandmarker || !video.videoWidth) {
          rafId = requestAnimationFrame(loop);
          return;
        }
        let result;
        try {
          result = faceLandmarker.detectForVideo(video, ts);
        } catch (e) {
          setRing(ringEl, 'warn');
          rafId = requestAnimationFrame(loop);
          return;
        }
        const landmarksList = result.faceLandmarks || [];
        const multiFace = landmarksList.length > 1;
        const lm = landmarksList[0];
        const blend = result.faceBlendshapes && result.faceBlendshapes[0];
        const blendCats = blend && blend.categories ? blend.categories : [];
        const nose = lm ? noseXY(lm) : null;
        const ctx = { nose, blendCats, baselineTurnX };

        if (!lm || multiFace) {
          setRing(ringEl, 'warn');
          if (captionEl) {
            captionEl.textContent = multiFace
              ? 'Please have only one face in the frame.'
              : 'We could not see your face clearly. Center your face in the circle.';
          }
          hold = 0;
        } else {
          const step = steps[stepIndex];
          const ok = step.detect(ctx);
          setRing(ringEl, ok ? 'ok' : 'idle');
          if (captionEl) captionEl.textContent = ok ? 'Hold steady…' : step.intro.split('.')[0] + '…';
          if (ok) hold += 16;
          else hold = Math.max(0, hold - 28);

          if (hold > HOLD_MS) {
            done.add(step.id);
            stepIndex += 1;
            hold = 0;
            baselineTurnX = nose != null ? nose.x : null;
            renderChecklist(checklistEl, steps, stepIndex, done);
            speak(step.success, { rate: 0.95 });
            if (stepIndex >= steps.length) {
              cancelAnimationFrame(rafId);
              rafId = null;
              speak('Verification completed successfully. Continue when ready.', {
                rate: 0.92
              }).then(() => {
                try {
                  landmarker.close();
                } catch (e) {}
                faceLandmarker = null;
                resolve({ mode: 'done' });
              });
              return;
            }
            stepStart = ts;
            speak(steps[stepIndex].intro);
          }
        }

        if (
          stepIndex < steps.length &&
          ts - stepStart > STEP_TIMEOUT_MS &&
          ts - lastRepeat > STEP_TIMEOUT_MS
        ) {
          lastRepeat = ts;
          speak(steps[stepIndex].intro + ' Take your time.');
        }

        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    });
  }

  global.LivenessFintech = { run, abort, buildDefaultSteps };
})(typeof window !== 'undefined' ? window : globalThis);
