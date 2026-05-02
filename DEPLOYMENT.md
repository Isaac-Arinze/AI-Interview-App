# ARIA MVP v1 - Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Heroku (Recommended if you have account)

**Prerequisites:**
- Heroku account (https://www.heroku.com/)
- Heroku CLI installed (https://devcenter.heroku.com/articles/heroku-cli)

**Steps:**
```bash
# Install Heroku CLI if not already installed
choco install heroku-cli

# Login to Heroku
heroku login

# Create a new Heroku app
heroku create your-app-name-here

# Add Heroku remote (if not already added)
heroku git:remote -a your-app-name-here

# Deploy
git push heroku master

# View logs
heroku logs --tail
```

**Your app will be at:** `https://your-app-name-here.herokuapp.com`

---

### Option 2: Render.com (FREE - Easiest!)

**Prerequisites:**
- GitHub account (already have)
- Render.com account (https://render.com)

**Steps:**
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `https://github.com/Isaac-Arinze/AI-Interview-App.git`
4. Fill in these settings **EXACTLY**:
   - **Name:** `aria-interview-app`
   - **Environment:** `Node`
   - **Build command:** `npm install`
   - **Start command:** `node server.js` ⚠️ **IMPORTANT: DO NOT USE node index.js**
   - **Plan:** Free (or Paid for guaranteed uptime)

5. Click "Deploy" and wait 2-3 minutes

**Your app will be at:** `https://aria-interview-app.onrender.com` (or similar)

> ⚠️ **Troubleshooting:** If you get "Cannot find module index.js" error:
> - Go to your Render service settings
> - Change "Start command" from `node index.js` to `node server.js`
> - Redeploy via the Render dashboard

> ⚠️ **Note:** Free tier on Render spins down after 15 min inactivity. Paid tier starts at $7/month for always-on.

---


**Steps:**
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Railway auto-detects Node.js
5. Set environment if needed
6. Deploy!

**Your app will be at:** Automatically generated URL

---

### Option 4: Azure App Service

**Prerequisites:**
- Azure account
- Azure CLI installed

**Steps:**
```bash
# Create resource group
az group create --name aria-rg --location eastus

# Create App Service Plan
az appservice plan create --name aria-plan --resource-group aria-rg --sku B1 --is-linux

# Create Web App
az webapp create --resource-group aria-rg --plan aria-plan --name aria-interview-app --runtime "NODE|18"

# Configure git deploy
az webapp deployment user set --user-name <username> --password <password>

# Deploy
git remote add azure <azure-git-url>
git push azure master
```

---

## 📋 MVP v1 Features

✅ **Backend:**
- ARIA Session Management (UUID-based)
- 12-Question Interview Flow
- Answer Evaluation Engine (4-dimension scoring)
- State Machine (7 states)
- RESTful API (5 endpoints)
- 125 unit tests, 94.71% coverage

✅ **Frontend:**
- Interview tab with recording UI
- Web Speech API integration (speech-to-text)
- Browser TTS (text-to-speech feedback)
- Real-time answer scoring
- Auto-advance between questions
- Final summary with personalized feedback

✅ **Conversation Flow:**
- Clear instructions at each step
- Better pacing/delays between questions
- Smart retry logic for short answers
- Personalized feedback based on scores
- Professional interview experience

---

## 🔧 Configuration

### Environment Variables (Optional)
Create `.env` file in root:
```
PORT=3000
NODE_ENV=production
```

### Server Settings
Default: `http://localhost:3000`

**API Endpoints:**
- `POST /api/aria/session/init` - Start interview
- `POST /api/aria/submit-answer` - Submit answer
- `GET /api/aria/session/:id` - Get session state
- `GET /api/aria/session/:id/summary` - Get results
- `DELETE /api/aria/session/:id` - End session

---

## 🧪 Before Deployment

```bash
# Run all tests
npm test

# Check syntax
node -c server.js

# Test locally
npm start

# Visit http://localhost:3000
```

---

## 📊 Session Data

Sessions are stored in-memory (5-minute TTL). For production, consider:
- PostgreSQL
- MongoDB
- Redis
- Firebase

---

## 🆘 Troubleshooting

**Buttons not working?**
- Hard refresh browser (Ctrl+F5)
- Check browser console for errors (F12)

**No sound?**
- Check microphone permissions
- Test in Chrome/Edge/Firefox (best support)
- Enable browser speakers

**API errors?**
- Check server logs
- Verify session_id format
- Confirm POST requests have proper JSON body

---

## 📱 Browser Support

- ✅ Chrome/Chromium (best)
- ✅ Firefox (good)
- ✅ Edge (good)
- ⚠️ Safari (limited Speech Recognition)
- ❌ IE11 (not supported)

---

## 🎯 Next Steps for Production

1. Database integration (move from in-memory)
2. User authentication
3. Session persistence
4. Advanced speech recognition (Google Cloud Speech-to-Text)
5. Call recording/playback
6. Admin dashboard
7. Analytics & reporting

---

## 📝 Version Info

- **Version:** 1.0.0 (MVP)
- **Release Date:** April 3, 2026
- **Repository:** https://github.com/Isaac-Arinze/AI-Interview-App
- **Tag:** v1.0.0

---

## 💡 Support

For issues or questions:
1. Check browser console (F12)
2. Review server logs
3. Verify network requests in DevTools
4. Check GitHub issues

---

Deploy and collect user feedback! 🚀
