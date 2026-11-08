# WallpaperHub Morocco — ChatGPT public help app (starter package)

This package prepares a **public, read-only MCP knowledge app**. It does not add a chatbot to the website and does not give ChatGPT access to user accounts, private community content, unpublished submissions, or site write operations.

## What's included

- `wallpaperhub-mcp.js`: Express registration for the stateless MCP endpoint and a simple health endpoint.
- `knowledge/wallpaperhub-knowledge.json`: public help articles grounded in the current public site pages and existing publisher UI.
- `package.json`: the existing project dependencies plus the MCP SDK and Zod.
- `vercel.json`: the current Vercel setup with the knowledge directory included in the serverless bundle.
- `privacy.html`: privacy page with an explanatory section for the ChatGPT help app.
- `support.html`: a public support page.
- `sitemap.xml`: current sitemap with the support page added.
- `chatgpt-submission/`: portable Agent Plugins `plugin.json`, `mcp.json`, listing icon, and initial reviewer test cases.
- `SERVER_JS_INSERTION.txt`: exact two edits required in the existing `server.js`.

## Important: this is a starter, not a live integration yet

The MCP endpoint will not exist until the files are added to the GitHub project, `server.js` is wired as described below, and Vercel successfully deploys the new version. The ChatGPT directory draft is not submitted or approved by this package.

## Add the files to the WallpaperHub repository

Copy these files/folders into the root of `nabil1995nabil/WallpaperHub`:

1. `wallpaperhub-mcp.js` into the project root.
2. The complete `knowledge/` folder into the project root.
3. Replace the project `package.json` with the included version (it preserves the dependency list fetched from the current `main` branch and adds `@modelcontextprotocol/sdk` and `zod`).
4. Replace `vercel.json` with the included version. It retains the existing routes and adds `knowledge/**` to `includeFiles`.
5. Replace `privacy.html` with the included version.
6. Add `support.html` to the project root.
7. Replace `sitemap.xml` with the included version.
8. Apply the two exact changes in `SERVER_JS_INSERTION.txt` to the existing `server.js`.

The `chatgpt-submission/` folder is a separate directory-submission package. Keep it locally for the OpenAI submission portal; it is not required by the website runtime and does not need to be copied into the Vercel site root.

Do not replace `server.js` with a new file. It is a large existing production server; only add the one `require` line and the one registration call at the positions described.

## Dependency lockfile

The repository already has a `package-lock.json`. After adding the two dependencies, run `npm install` in the project root and commit the generated updated `package-lock.json` as well. Do not keep an old lockfile paired with a new package manifest if your deployment uses `npm ci`.

Required runtime: Node.js 18 or later. No OpenAI API key is needed for this MCP knowledge server: it simply returns the site's public help articles to ChatGPT. Normal Vercel hosting usage/limits still apply.

## Deploy and smoke-test

After the changes are pushed and Vercel finishes deploying:

1. Open `https://wallpaperhub-morocco.vercel.app/mcp/health`. It should return JSON with `status: "ok"`, service name, and tools `search` and `fetch`.
2. Use the official MCP Inspector or the ChatGPT developer submission portal to connect to `https://wallpaperhub-morocco.vercel.app/mcp`.
3. Confirm that `tools/list` shows only `search` and `fetch`.
4. Try `search` with `كيفاش نحمل خلفية` and verify it returns the download guide.
5. Call `fetch` with `download-wallpaper` and verify the returned article text and URL.
6. Try a private account question and a publish/delete command. The service should not provide private data or any write tool; it should only return the public help documents that match, or no results.

A browser opening `/mcp` with GET is expected to return HTTP 405 because the MCP transport accepts POST. Use `/mcp/health` for a simple browser health check.

## Prepare public ChatGPT directory submission

The folder `chatgpt-submission/` contains the portable Agent Plugins package. Once the live endpoint is tested:

1. Sign in to the OpenAI Platform with an account that has plugin submission permissions (`api.apps.write`).
2. Complete individual or business identity verification for the publisher name you choose.
3. Check the live website, support, privacy, and terms URLs from the manifest.
4. In the Plugins submission portal, submit the remote MCP endpoint through **With MCP** and use `https://wallpaperhub-morocco.vercel.app/mcp`.
5. Scan the tools and verify their descriptions and read-only annotations. Review and complete the five positive and three negative test cases included in `plugin.json`.
6. Record a real short video walkthrough after the live service works, then add its publicly accessible URL as `extensions.com.openai.review.demo_recording_url` before final review. This package intentionally does not contain a fake video URL.
7. Complete any domain-verification challenge shown by the portal. OpenAI supplies the challenge value; it cannot be safely guessed or prefilled here. Add the exact value at the required `/.well-known/openai-apps-challenge` URL only after it is provided.
8. Submit for OpenAI review. Approval and publication are decided by OpenAI and are not guaranteed.

OpenAI's current review requirements also state that remote MCP submissions need a public HTTPS endpoint and verified publisher identity. Its review documentation currently notes that projects configured for EU data residency cannot submit MCP plugins for review; check the data-residency setting of the OpenAI Platform project used for submission before starting review.

## Security boundaries

- No Supabase or Firebase credentials are read by `wallpaperhub-mcp.js`.
- No personal profiles, private messages, private forums, tokens, drafts, or moderation data are queried.
- `search` and `fetch` are the only tools.
- Both tools advertise `readOnlyHint: true` and `destructiveHint: false`.
- Do not add publishing, account lookup, private chat, or deletion tools to this public app without a separate security and privacy review.

## Source pages used to prepare the knowledge base

- About: https://wallpaperhub-morocco.vercel.app/about.html
- Browse wallpapers: https://wallpaperhub-morocco.vercel.app/all-wallpapers.html
- Categories: https://wallpaperhub-morocco.vercel.app/categories.html
- Wallpaper details: https://wallpaperhub-morocco.vercel.app/wallpaper.html
- Publish: https://wallpaperhub-morocco.vercel.app/publish.html
- Community: https://wallpaperhub-morocco.vercel.app/community.html
- Developer API: https://wallpaperhub-morocco.vercel.app/developers.html
- Privacy / terms: https://wallpaperhub-morocco.vercel.app/privacy.html

Some instructions are based on the current UI and code, and may change when the website changes. Update the JSON knowledge articles whenever the related public pages or publishing flow change.
