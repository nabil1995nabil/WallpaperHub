# WallpaperHub — Automatic site languages

## Required Vercel environment variable

Add `GOOGLE_TRANSLATE_API_KEY` in Vercel → Project → Settings → Environment Variables.

Create or select a Google Cloud project, enable **Cloud Translation API**, create an API key, restrict it to Cloud Translation API, and keep it server-side. Never add the key to browser JavaScript.

Redeploy after adding the variable.

## Behaviour

- The language picker is in Settings → System → Language.
- The selected language is stored in the browser and applied across full pages and dynamically inserted components.
- The list is fetched from Google Cloud Translation and reflects the languages supported by the provider.
- Arabic, Hebrew, Persian, Urdu, Pashto, Sindhi, Uyghur, Yiddish and Divehi use RTL direction.
- Translation is machine-generated and may not preserve every specialised term perfectly.
- Translation requests pass through `/api/translate`; the Google key is never sent to the browser.

## Cost and limits

Cloud Translation is a metered Google Cloud service. Enable billing and configure budgets/quotas in Google Cloud. The server batches text, limits request sizes, and applies a basic per-IP rate limit.

Official docs: https://cloud.google.com/translate/docs