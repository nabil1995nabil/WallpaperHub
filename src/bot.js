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
            "اضغط على الزر أدناه لفتح لوحة نشر الخلفيات داخل Telegram.",
            { reply_markup: keyboard }
        );
    });

    bot.hears("📤 نشر خلفية", async (ctx) => {
        await ctx.reply("افتح لوحة نشر الخلفيات من الزر أدناه.", {
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
