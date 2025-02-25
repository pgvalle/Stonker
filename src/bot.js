const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api

// get token from environment variable
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
    polling: true
})

// send message with markdown formatting
async function sendMsg(user, msg) {
    await bot.sendMessage(user, msg, {
        parse_mode: 'Markdown'
    })
}

module.exports = {
    bot, sendMsg
}