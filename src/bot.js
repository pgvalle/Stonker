const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api

// get token from environment variable
const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(TOKEN, {
    polling: true
})

// respond to plain messages. Just repeat what the user says.
bot.onText(/^(?!\/\S).+/s, (msg, _) => {
    const user = msg.chat.id
    sendMsg(user, msg.text)
})

// send message with markdown formatting
async function sendMsg(user, str) {
    await bot.sendMessage(user, str, {
        parse_mode: 'Markdown'
    })
}

module.exports = {
    sendMsg
}
