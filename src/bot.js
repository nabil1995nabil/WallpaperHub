require("dotenv").config();
const { Bot, Keyboard } = require("grammy");

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL;

if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN in the hosting environment.");
  process.exit(1);
}

if (!miniAppUrl || !/^https:\/\/\S+$/i.test(miniAppUrl)) {
  console.error("Set TELEGRAM_MINI_APP_URL to the deployed HTTPS publish-telegram.html URL.");
  process.exit(1);
}

const bot = new Bot(token);
const keyboard = new Keyboard()
  .webApp("📤 نشر خلفية", miniAppUrl)
  .resized();

bot.command("start", async (ctx) => {
  await ctx.reply(
    "مرحباً بك في WallpaperHub 🖼️\\n\\n" +
    "اضغط على الزر أدناه لفتح لوحة نشر الخلفيات داخل Telegram.",
    { reply_markup: keyboard }
  );
});

bot.hears("📤 نشر خلفية", async (ctx) => {
  await ctx.reply("اضغط على زر «📤 نشر خلفية» لفتح لوحة النشر.", {
    reply_markup: keyboard
  });
});

bot.catch((err) => {
  console.error("Telegram bot error:", err.error);
});

bot.start({
  onStart: (info) => console.log(`WallpaperHub bot started as @${info.username}`)
});
