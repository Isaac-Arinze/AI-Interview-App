# ARIA Interview System - Quick Start Guide

## 🚀 Start Using ARIA Interviews

### Step 1: Ensure Server is Running
```bash
cd c:\Users\Staff\Downloads\tts-studio
node server.js
```
You should see:
```
✅ TTS Studio running at http://localhost:3000
```

### Step 2: Open Interview Tab
1. Go to `http://localhost:3000` in your browser
2. Look for the **🎙️ Interview** tab (4th tab)
3. Click to switch to the interview engine

### Step 3: Start an Interview
1. **Enter Candidate Name** - Your name
2. **Select Target Role:**
   - Software Engineer
   - Product Manager
   - Data Analyst
   - Marketing
   - Other

3. **Choose Language** - English (US) variant
4. **Click "Start Interview"** button

### Step 4: Answer Questions
For each question:
1. Read the question displayed
2. Click **"Start Recording"** 
3. Speak your answer clearly
4. Click **"Stop Recording"** when done
5. System will:
   - Analyze your answer
   - Calculate score (0-100)
   - Show dimension breakdown
   - Display feedback
6. Click **"Next Question"** to continue

### Step 5: View Results
After all questions:
- **Overall Performance Score** (0-100)
- **Dimension Scores:**
  - Relevance (0-25)
  - Depth (0-25)
  - Structure (0-25)
  - Communication (0-25)
- **Interview Statistics:**
  - Questions answered
  - Average duration
  - Total time

---

## 📊 Understanding Your Scores

### Scoring Dimensions

| Dimension | What it Measures | How to Improve |
|-----------|------------------|----------------|
| **Relevance** | Does answer address the question? | Focus on key points, stay on topic |
| **Depth** | How thorough/detailed is the response? | Add specific examples and details |
| **Structure** | How well organized is the answer? | Use situation-task-action-result |
| **Communication** | Clarity, confidence, professionalism | Minimize filler words (um, like, etc) |

### Interview Phases

| Phase | Questions | Type | Goal |
|-------|-----------|------|------|
| **1** | Warmup (1Q) | Personal intro | Build rapport |
| **2** | Behavioral (3Q) | STAR format | Assess past performance |
| **3** | Situational (2Q) | Hypothetical | Evaluate decision-making |
| **4** | Role-specific (2Q) | Technical | Assess role fit |
| **5** | Q&A (2Q) | Your questions | Show interest |

---

## 🎤 Recording Tips

1. **Microphone Setup**
   - Use headset or built-in mic
   - Minimize background noise
   - Test recording before starting

2. **Answer Delivery**
   - Speak clearly and naturally
   - Aim for 30-60 seconds per answer
   - Pause for emphasis, avoid rushing

3. **Content Tips**
   - Start with situation/context
   - Include concrete examples
   - End with result/outcome
   - Relate to role when possible

---

## 🔧 Troubleshooting

### Microphone Access Denied
- Check browser permissions
- Allow microphone access when prompted
- Try a different browser (Chrome recommended)

### Questions Not Loading
- Refresh the page (Ctrl+R)
- Check browser console (F12) for errors
- Verify server is still running

### Scores Showing "--"
- This is placeholder until STT/LLM integration
- Currently shows heuristic scoring
- Scores are calculated, just not displayed in demo

### Recording Won't Start
- Verify browser supports Web Audio API
- Try: Chrome, Firefox, Edge (Safari limited)
- Check OS microphone permissions

---

## 📱 API Integration Examples

### JavaScript Frontend (Already Done ✅)
```javascript
// Initialize interview
const res = await fetch('/api/aria/session/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    role: 'Software Engineer',
    language: 'en-US'
  })
});

const { session_id, current_question } = await res.json();
console.log(`Interview started: ${session_id}`);
```

### Backend Integration (Your API)
```javascript
// Use ARIA API endpoints directly
POST   /api/aria/session/init        → Start interview
POST   /api/aria/submit-answer       → Evaluate answer
GET    /api/aria/session/:id         → Get status
GET    /api/aria/session/:id/summary → Get results
DELETE /api/aria/session/:id         → Clean up
```

---

## 📈 Next Steps

### For Testing
- [ ] Run full interview as candidate
- [ ] Test all 5 phases
- [ ] Try different roles
- [ ] Review scoring accuracy

### For Development
- [ ] Integrate Speech-to-Text API
- [ ] Add LLM-based evaluation
- [ ] Build recruiter dashboard
- [ ] Set up session persistence (database)

### For Production
- [ ] Configure CORS for your domain
- [ ] Add API authentication
- [ ] Deploy to cloud (Heroku, AWS, etc)
- [ ] Set up logging/monitoring
- [ ] Configure session timeouts

---

## 📚 Architecture Reference

```
┌──────────────────────────────────────────────────────────┐
│                    Interview Flow                         │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  INIT INTERVIEW                                            │
│      ↓                                                      │
│  SHOW QUESTION #1                                         │
│      ↓                                                      │
│  USER RECORDS ANSWER (audio blob)                         │
│      ↓                                                      │
│  SUBMIT_ANSWER: { session_id, transcript, duration, ... } │
│      ↓                                                      │
│  EVALUATE (heuristic or LLM scoring)                     │
│      ↓                                                      │
│  RETURN: { scores, acknowledgment, next_action }         │
│      ↓                                                      │
│  next_action = NEXT_QUESTION | RETRY | SHOW_SUMMARY     │
│      ↓                                                      │
│  IF MORE QUESTIONS → SHOW QUESTION #2, #3, ...           │
│  IF END → SHOW SUMMARY                                    │
│      ↓                                                      │
│  FETCH: GET /api/aria/session/:id/summary                │
│      ↓                                                      │
│  DISPLAY RESULTS                                          │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

## 🆘 Getting Help

### Common Issues

**Q: All scores show "--" / null**
A: The demo uses placeholder heuristic scoring being developed. Production will use LLM evaluation for more accurate scoring.

**Q: Can I skip questions?**
A: Currently no - full 20-question flow required. Can be customized per role.

**Q: How long does interview take?**
A: ~30-45 minutes average (20 questions × 2-3 min each)

**Q: Can I save and resume?**
A: Not in current version (sessions expire after 10 min). Can be added via database.

**Q: Is audio recorded permanently?**
A: No - audio is only used for transcription during the session, not stored.

---

## 📋 Checklist Before Deploying

- [ ] Server starts without errors: `node server.js`
- [ ] All 124 tests pass: `npm test`
- [ ] Interview tab visible in browser
- [ ] Can initialize session successfully
- [ ] Microphone permissions working
- [ ] Recording starts/stops properly
- [ ] Scores display after submission
- [ ] Summary shows after all questions
- [ ] Server runs on http://localhost:3000

---

## Questions?
See **ARIA_INTEGRATION_COMPLETE.md** for full technical documentation.
