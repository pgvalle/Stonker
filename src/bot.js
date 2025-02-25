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

// Respond to commands, like /stock.
function onCmd(callback) {
    const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    bot.onText(CMD_REGEX, callback)
}

// Respond to plain messages
function onPlainMsg(callback) {
    const PLAIN_MSG_REGEX = /^(?!\/\S).+/s
    bot.onText(PLAIN_MSG_REGEX, callback)
}

module.exports = {
    sendMsg, onCommand, onPlainMsg
}