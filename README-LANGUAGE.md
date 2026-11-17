# WallpaperHub — Automatic site languages

## Translation provider

WallpaperHub uses the **MyMemory Translation API** in its free anonymous mode.

- No API key is needed.
- No Google Cloud project, billing account, payment card, or paid plan is needed.
- The anonymous free allowance is 5,000 characters per day.
- Optionally, set a valid contact email in `MYMEMORY_CONTACT_EMAIL` to raise the documented free allowance to 50,000 characters per day. This is optional and is not a payment method.
- MyMemory accepts up to 500 UTF-8 bytes per translation segment. The server safely splits longer text nodes and sends segments sequentially.

## Vercel setup

No environment variable is required for the default anonymous free mode.

Optional:
1. Open Vercel → Project → Settings → Environment Variables.
2. Add `MYMEMORY_CONTACT_EMAIL` with a valid contact email address.
3. Redeploy.

Do not add `GOOGLE_TRANSLATE_API_KEY`; the site no longer uses Google Cloud Translation.

## Behaviour

- The language picker is in Settings → System → Language.
- The selected language is stored in the browser and applied across full pages and dynamically inserted components.
- The language list is bundled with the browser runtime, so no paid language-list API is needed.
- Arabic and other right-to-left languages automatically use RTL direction.
- Browser-side translation caching reduces repeat API calls.
- Machine translation quality and supported language pairs can vary. The service may temporarily stop translating after its daily free allowance is reached; the site will show a clear notice and can try again when the allowance resets.

## Official provider documentation

- API specification: https://mymemory.translated.net/doc/spec.php
- Usage limits: https://mymemory.translated.net/doc/usagelimits.php
- Terms: https://mymemory.translated.net/terms-and-conditions
