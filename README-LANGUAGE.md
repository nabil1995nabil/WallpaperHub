# WallpaperHub — Site languages and shared translation cache

## Languages

The site language picker offers 27 commonly used languages supported by the BytePlus Text Translation API:

English (`en`), 简体中文 (`zh`), हिन्दी (`hi`), Español (`es`), العربية (`ar`), Français (`fr`), বাংলা (`bn`), Português (`pt`), Bahasa Indonesia (`id`), اردو (`ur`), Русский (`ru`), Deutsch (`de`), 日本語 (`ja`), Türkçe (`tr`), 한국어 (`ko`), Tiếng Việt (`vi`), ไทย (`th`), فارسی (`fa`), Bahasa Melayu (`ms`), Italiano (`it`), Kiswahili (`sw`), Filipino (`tl`), Polski (`pl`), Nederlands (`nl`), 繁體中文 (`zh-Hant`), தமிழ் (`ta`), Українська (`uk`).

## Provider and free-use protection

WallpaperHub uses the BytePlus **Text Translation API**. BytePlus documents a free trial quota of 2,000,000 characters per natural month. Its documentation says free-trial requests stop until the next month after the quota is exhausted; usage beyond the free quota is billed only when a paid version is subscribed. Do not subscribe to the paid version if the site must remain free.

WallpaperHub also enforces a server-side monthly reservation limit of **1,900,000 characters** by default. This leaves a 100,000-character safety margin under the documented provider quota. The cap cannot be raised above 1,900,000 through the environment variable.

The BytePlus Access Key ID and Secret Access Key are used only by `server.js`. They must never be added to frontend files or committed to GitHub.

## Shared Supabase translation cache

Translations are cached centrally in Supabase and reused by every visitor:

- First request for a text + target language: read cache, translate only on a cache miss, then save the result.
- Later requests for the same text and language: return the stored translation without calling BytePlus.
- If the original text changes, its SHA-256 cache key changes and only the new text is translated.
- The browser also keeps a small local cache to reduce repeat requests.
- Source language detection is delegated to BytePlus; the API request omits `SourceLanguage`.

### 1. Create the Supabase cache and usage guard

Open the Supabase project → SQL Editor → New query. Copy and run the complete SQL file:

`supabase/migrations/20261117_wallpaperhub_translation_cache.sql`

The migration creates the private translation cache, monthly character counter, and an atomic reservation function. It enables Row Level Security and grants access only to the server-side `service_role`.

### 2. Configure Vercel

Open Vercel → WallpaperHub project → Settings → Environment Variables. Add the following to Production (and Preview if needed):

- `BYTEPLUS_ACCESS_KEY_ID` — BytePlus AccessKey ID.
- `BYTEPLUS_SECRET_ACCESS_KEY` — BytePlus AccessKey Secret.
- `BYTEPLUS_REGION` — `ap-singapore-1` (default).
- `BYTEPLUS_MONTHLY_CHAR_CAP` — optional; defaults to `1900000`.

WallpaperHub already uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server. Confirm that both are present in Vercel. Never share or commit the service-role key.

### 3. Enable BytePlus free trial

In BytePlus Console, enable the BytePlus Translate free-trial service and create an Access Key ID / Secret Access Key under Account → IAM → Key Management. Keep the account on the free trial. Do not subscribe to the paid version. If the free quota is exhausted, BytePlus says the free trial remains unavailable until the next month.

### 4. Redeploy

After the SQL is executed and the Vercel environment variables are saved, redeploy the project so the server can use the keys.

## Behaviour

- The picker is in Settings → System → Language.
- The selected language is stored in the browser and applied across full pages and dynamically inserted components.
- Language names are shown in their native writing systems and can be searched.
- Arabic, Persian, and Urdu use right-to-left direction.
- Translation results are shared through Supabase; each distinct text/target-language combination is translated once and reused.
- New or edited text is translated when it is first requested in a target language.
- Text translation supports up to eight text items per BytePlus API request, with source detection enabled by omitting the source-language field.
- Machine translation may contain mistakes; the language picker does not translate text inside code blocks, editable fields, SVGs, or elements explicitly marked as non-translatable.

## Official references

- BytePlus supported languages: https://docs.byteplus.com/en/docs/translate/docs-supported-languages
- Text Translation API: https://docs.byteplus.com/en/docs/translate/docs-text-translate
- BytePlus free quota and billing: https://docs.byteplus.com/en/docs/translate/docs-billing
- Access Key generation: https://docs.byteplus.com/en/docs/translate/docs-generating-account-tokens
