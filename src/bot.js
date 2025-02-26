const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api

// get token from environment variable
const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token, {
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
    const cmdPattern = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    bot.onText(cmdPattern, callback)
}

// Respond to plain messages
function onPlainMsg(callback) {
    const plainMsgPattern = /^(?!\/\S).+/s
    bot.onText(plainMsgPattern, callback)
}

module.exports = {
    sendMsg, onCmd, onPlainMsg
}