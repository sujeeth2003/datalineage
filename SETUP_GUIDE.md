# DataLineage — Setup Guide

Files save directly to YOUR Google Drive using your own Google account.
No service accounts, no quota issues.

---

## How it works

You run a script once on your laptop to get a permanent refresh token.
Vercel uses that token to write files to your Drive on every commit.

```
User uploads CSV → Vercel serverless function → Your Google Drive
                   (uses your refresh token)
```

---

## Step 1 — Google Cloud setup (5 min)

1. Go to https://console.cloud.google.com
2. Create a project (e.g. "DataLineage")
3. **APIs & Services → Enable APIs → Google Drive API → Enable**
4. **Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Desktop app**
   - Name: DataLineage
5. Download the JSON, open it — you need `client_id` and `client_secret`
6. **Credentials → Create Credentials → API Key** (for frontend reads)
   - Restrict to: HTTP referrers → your Vercel domain
   - API restriction: Google Drive API only

---

## Step 2 — Get your refresh token (2 min, run once on your laptop)

```bash
pip install google-auth-oauthlib
python get_refresh_token.py
```

- It opens a browser → sign in with YOUR Google account
- Paste your `client_id` and `client_secret` when asked
- It prints `GOOGLE_REFRESH_TOKEN=...` — copy it

---

## Step 3 — Add 4 env vars to Vercel

| Variable | Where |
|---|---|
| `REACT_APP_GOOGLE_API_KEY` | Step 1, API key |
| `GOOGLE_CLIENT_ID` | Step 1, OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | Step 1, OAuth credentials |
| `GOOGLE_REFRESH_TOKEN` | Step 2 output |

Vercel → Settings → Environment Variables → add all four → **Redeploy**.

---

## Where your files appear

After the first repo is created, a folder called **DataLineage** will appear
in the root of YOUR Google Drive. Every repo is a `.json` file inside it.
You can open, read, and share them directly from Drive.

---

## Local development

Create `.env.local`:
```
REACT_APP_GOOGLE_API_KEY=AIzaSy...
GOOGLE_CLIENT_ID=123...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REFRESH_TOKEN=1//...
```

```bash
npm i -g vercel
vercel dev
```
