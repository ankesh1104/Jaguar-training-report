# Training Report Generator — Fixed for standalone deployment

## What was actually broken

This app was originally built as a **Claude Artifact**, which gives it two
special browser APIs that only exist inside Claude's sandbox:

1. **`window.storage`** — used to save the Email Setup, Google Sheet Setup,
   your logo, and drafts. Outside Claude, this API doesn't exist, so every
   save/load silently failed (the code wraps them in try/catch, so it looked
   like nothing happened rather than throwing a visible error).
2. **Direct call to `https://api.anthropic.com/v1/messages`** for the "✨ AI
   auto-fill" feature — this has no API key attached and browsers block
   cross-origin calls like this anyway, so the AI button could never work
   once the app left Claude.

Both are fixed here:

- `window.storage` now has a **polyfill** at the top of the script in
  `index.html` that saves everything to the browser's `localStorage` instead.
  Email Setup, Google Sheet Setup, drafts and logo will now persist properly.
- The AI button now calls **`/.netlify/functions/generate-content`**, a small
  serverless function (`netlify/functions/generate-content.js`) that calls
  Anthropic's API on Netlify's server, where your API key can be kept secret.

## Deploy to Netlify

1. Go to https://app.netlify.com → **Add new site → Deploy manually**, and
   drag this whole folder in. (Or push it to a GitHub repo and connect it —
   either way, `netlify.toml` already points Netlify at the `netlify/functions`
   folder.)
2. Once deployed, go to **Site configuration → Environment variables** and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key from https://console.anthropic.com/settings/keys
3. Redeploy the site (Deploys → Trigger deploy) so the function can see the
   new environment variable.
4. Open the site once and use **⚙️ Email Setup** to enter your EmailJS
   Public Key, Service ID and Template ID (from https://emailjs.com — a
   free account, as the in-app instructions describe). This is unrelated to
   the AI feature and is what actually sends the report by email.

If you don't want the AI auto-fill feature at all, you can skip step 2 —
everything else (Excel generation, emailing, Google Sheet logging) works
without it; only the ✨ auto-fill button will show an error if the key isn't set.

## Turning it into an installable app with PWABuilder

Once the Netlify site is live and working in the browser:

1. Go to https://www.pwabuilder.com
2. Paste your live Netlify URL (e.g. `https://your-site.netlify.app`) and
   click **Start**.
3. PWABuilder will read `manifest.json` and `service-worker.js` (already
   included) and report the app as installable. Use **Package for Stores**
   if you want an Android/Windows package, or just let users "Install app"
   from the browser address bar — that already works with the manifest as-is.

## Why "mail not sent" was showing an error

The **Generate Excel & Send Report** button downloads the Excel file first
(always works, purely local), then sends the email via EmailJS. EmailJS
needs the Public Key / Service ID / Template ID from Email Setup to actually
send — and since those were never being saved (see the `window.storage` bug
above), the app always thought Email Setup was empty, so every send attempt
failed. That's now fixed the same way as everything else — re-enter your
EmailJS details once after deploying and they'll stick.
