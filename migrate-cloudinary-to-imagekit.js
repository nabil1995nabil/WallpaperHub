/**
 * WallpaperHub: migrate Cloudinary wallpaper URLs to ImageKit.
 *
 * Safe by default: performs a dry run. Use --apply to upload and update Supabase.
 *
 * Required environment variables:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)
 *   IMAGEKIT_PRIVATE_KEY
 *
 * Optional:
 *   IMAGEKIT_URL_ENDPOINT (defaults to the endpoint currently used by WallpaperHub)
 *   MIGRATION_BATCH_SIZE (defaults to 100)
 *
 * Run:
 *   node migrate-cloudinary-to-imagekit.js
 *   node migrate-cloudinary-to-imagekit.js --apply
 */

const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").trim();
const SUPABASE_KEY = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ""
).trim();
const IMAGEKIT_PRIVATE_KEY = String(process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
const IMAGEKIT_URL_ENDPOINT = String(
  process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/2xcgjj3oe"
).trim().replace(/\/+$/, "");

const APPLY = process.argv.includes("--apply");
const BATCH_SIZE = Math.max(
  1,
  Math.min(500, Number.parseInt(process.env.MIGRATION_BATCH_SIZE || "100", 10) || 100)
);
const TABLE = "wallpapers";
const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY.");
  process.exit(1);
}
if (APPLY && !IMAGEKIT_PRIVATE_KEY) {
  console.error("Missing IMAGEKIT_PRIVATE_KEY. It is required when using --apply.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const uploadedBySourceUrl = new Map();
const stats = { rows: 0, cloudinaryUrls: 0, migratedRows: 0, failedRows: 0, skippedRows: 0 };

function isCloudinaryUrl(value) {
  try {
    const u = new URL(String(value || "").trim());
    return u.protocol === "https:" && u.hostname.toLowerCase() === "res.cloudinary.com";
  } catch (_) {
    return false;
  }
}

function extensionFromUrl(value) {
  try {
    const pathname = new URL(value).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    const ext = match ? match[1].toLowerCase() : "jpg";
    return ["jpg", "jpeg", "png", "webp", "avif"].includes(ext) ? ext : "jpg";
  } catch (_) {
    return "jpg";
  }
}

function safeFilePart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "wallpaper";
}

function multipart(fields, boundary) {
  const chunks = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
      `${String(value)}\r\n`,
      "utf8"
    ));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
  return Buffer.concat(chunks);
}

async function uploadRemoteUrlToImageKit(sourceUrl, fileName) {
  const boundary = `----WallpaperHub${crypto.randomBytes(12).toString("hex")}`;
  const body = multipart({
    file: sourceUrl,
    fileName,
    folder: "/wallpapers-migrated",
    useUniqueFileName: "false",
    overwriteFile: "true"
  }, boundary);

  const response = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString("base64")}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.length)
    },
    body,
    timeout: 120000
  });

  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch (_) { data = null; }

  if (!response.ok || !data || !data.url) {
    const message = data?.message || data?.help || raw.slice(0, 500) || response.statusText;
    throw new Error(`ImageKit upload failed (${response.status}): ${message}`);
  }

  const newUrl = String(data.url);
  if (!newUrl.startsWith(IMAGEKIT_URL_ENDPOINT + "/") &&
      !newUrl.startsWith(IMAGEKIT_URL_ENDPOINT + "?")) {
    throw new Error(`ImageKit returned an unexpected URL: ${newUrl}`);
  }

  // Verify the newly uploaded asset is reachable before updating Supabase.
  const verify = await fetch(newUrl, { method: "GET", timeout: 30000 });
  if (!verify.ok) {
    throw new Error(`ImageKit URL verification failed (${verify.status}): ${newUrl}`);
  }
  // Consume the response stream to release the connection.
  if (verify.body && typeof verify.body.destroy === "function") verify.body.destroy();

  return newUrl;
}

async function migrateUrl(sourceUrl, rowId, fieldName) {
  if (!isCloudinaryUrl(sourceUrl)) return sourceUrl;
  if (uploadedBySourceUrl.has(sourceUrl)) return uploadedBySourceUrl.get(sourceUrl);

  const ext = extensionFromUrl(sourceUrl);
  const fileName = `${safeFilePart(rowId)}-${fieldName}.${ext}`;
  const newUrl = await uploadRemoteUrlToImageKit(sourceUrl, fileName);
  uploadedBySourceUrl.set(sourceUrl, newUrl);
  return newUrl;
}

async function main() {
  console.log(`WallpaperHub Cloudinary → ImageKit migration`);
  console.log(`Mode: ${APPLY ? "LIVE (uploads + Supabase updates)" : "DRY RUN (no changes)"}`);
  console.log(`Table: ${TABLE}`);

  let offset = 0;
  while (true) {
    const { data: rows, error } = await supabase
      .from(TABLE)
      .select("id,image,thumbnail")
      .order("id", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      stats.rows++;
      const imageOld = String(row.image || "").trim();
      const thumbOld = String(row.thumbnail || "").trim();
      const imageNeeds = isCloudinaryUrl(imageOld);
      const thumbNeeds = isCloudinaryUrl(thumbOld);

      if (!imageNeeds && !thumbNeeds) {
        stats.skippedRows++;
        continue;
      }

      stats.cloudinaryUrls += Number(imageNeeds) + Number(thumbNeeds);
      console.log(`\n[${row.id}] Cloudinary fields: ${[
        imageNeeds ? "image" : null,
        thumbNeeds ? "thumbnail" : null
      ].filter(Boolean).join(", ")}`);

      if (!APPLY) {
        console.log("  DRY RUN: would migrate this row.");
        continue;
      }

      try {
        // Do not update the database until every required field has migrated.
        const imageNew = imageNeeds
          ? await migrateUrl(imageOld, row.id, "image")
          : imageOld;

        const thumbNew = thumbNeeds
          ? (thumbOld === imageOld
              ? imageNew
              : await migrateUrl(thumbOld, row.id, "thumbnail"))
          : thumbOld;

        const update = {};
        if (imageNeeds) update.image = imageNew;
        if (thumbNeeds) update.thumbnail = thumbNew;

        const { error: updateError } = await supabase
          .from(TABLE)
          .update(update)
          .eq("id", row.id);

        if (updateError) throw new Error(`Supabase update failed: ${updateError.message}`);

        stats.migratedRows++;
        console.log("  OK: ImageKit upload(s) verified and Supabase row updated.");
      } catch (error) {
        stats.failedRows++;
        console.error(`  FAILED: ${error.message}`);
        // Continue with other wallpapers; failed rows remain unchanged in Supabase.
      }
    }

    if (rows.length < BATCH_SIZE) break;
    offset += rows.length;
  }

  console.log("\n========== MIGRATION SUMMARY ==========");
  console.log(`Rows scanned:       ${stats.rows}`);
  console.log(`Cloudinary URLs:    ${stats.cloudinaryUrls}`);
  console.log(`Rows migrated:      ${stats.migratedRows}`);
  console.log(`Rows skipped:       ${stats.skippedRows}`);
  console.log(`Rows failed:        ${stats.failedRows}`);
  if (!APPLY) {
    console.log("\nNo files were uploaded and no database rows were changed.");
    console.log("After checking the count, run again with --apply to perform migration.");
  }
  if (stats.failedRows > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error("\nMIGRATION STOPPED:", error.message || error);
  process.exit(1);
});
