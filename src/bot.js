const { Bot, Keyboard, webhookCallback } = require("grammy");

function createTelegramBot({ token, miniAppUrl }) {
    if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
    if (!miniAppUrl || !/^https:\/\/\S+$/i.test(miniAppUrl)) {
        throw new Error("TELEGRAM_MINI_APP_URL must be an HTTPS URL");
    }

    const bot = new Bot(token);
    const keyboard = new Keyboard()
        .webApp("📤 نشر خلفية", miniAppUrl)
        .resized();

    bot.command("start", async (ctx) => {
        await ctx.reply(
            "مرحباً بك في WallpaperHub 🖼️\n\n" +
            "قبل أول نشر، اربط حساب Telegram بحساب WallpaperHub ديالك من صفحة البروفايل. " +
            "من بعد اضغط على الزر لفتح لوحة النشر؛ غادي نتحققو من الحساب والصلاحيات تلقائياً.",
            { reply_markup: keyboard }
        );
    });

    bot.command("publish", async (ctx) => {
        await ctx.reply("افتح لوحة النشر من الزر أدناه. خاص Telegram يكون مربوط بحساب WallpaperHub ديالك.", {
            reply_markup: keyboard
        });
    });

    bot.command("help", async (ctx) => {
        await ctx.reply(
            "طريقة الاستعمال:\n1) ربط حساب Telegram من بروفايل WallpaperHub.\n" +
            "2) فتح لوحة النشر من الزر أدناه.\n3) رفع الخلفية وإرسالها للمراجعة أو النشر حسب صلاحيات حسابك.",
            { reply_markup: keyboard }
        );
    });

    bot.hears("📤 نشر خلفية", async (ctx) => {
        await ctx.reply("افتح لوحة النشر من الزر أدناه. إذا ما ربطتيش Telegram بعد، افتح البروفايل واربط نفس الحساب أولاً.", {
            reply_markup: keyboard
        });
    });

    bot.catch((err) => {
        console.error("Telegram bot update error:", err.error?.message || err.error || err);
    });

    return {
        bot,
        webhookHandler: webhookCallback(bot, "express")
    };
}

module.exports = { createTelegramBot };
