require("dotenv").config();
const { Bot, Keyboard } = require("grammy");

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL;

if (!token || token === "put_botfather_token_here") {
  console.error("Missing TELEGRAM_BOT_TOKEN. Add it to .env or your hosting environment.");
  process.exit(1);
}
if (!miniAppUrl || !/^https:\/\/[^ ]+$/i.test(miniAppUrl) || miniAppUrl.includes("YOUR-DOMAIN")) {
  console.error("Set TELEGRAM_MINI_APP_URL to the deployed HTTPS URL of publish-telegram.html.");
  process.exit(1);
}

const bot = new Bot(token);
const keyboard = new Keyboard()
  .webApp("📤 نشر خلفية", miniAppUrl)
  .resized();

bot.command("start", async (ctx) => {
  await ctx.reply(
    "مرحباً بك في WallpaperHub 🖼️\n\n" +
    "افتح لوحة النشر الكاملة داخل Telegram. فيها نفس حقول Publish Studio، " +,
    { reply_markup: keyboard }
  );
});

bot.hears("📤 نشر خلفية", async (ctx) => {
  await ctx.reply("اضغط الزر لفتح لوحة النشر.", { reply_markup: keyboard });
});

bot.catch((err) => console.error("Telegram bot error:", err.error));
bot.start({ onStart: (info) => console.log(`WallpaperHub bot started as @${info.username}`) });
