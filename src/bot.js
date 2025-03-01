const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api

// get token from environment variable
const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token, {
    polling: true
})

// send message with markdown formatting
async function sendMsg(user, str) {
    await bot.sendMessage(user, str, {
        parse_mode: 'Markdown'
    })
}

// Respond commands, like /stock.
function respondToCmds(cmds) {
    const cmdRegex = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    const timeLastCmd = {}

    bot.onText(cmdRegex, (msg, match) => {
        const user = msg.chat.id
        const now = Date.now();

        if (now - timeLastCmd[user] < 1000) {
            sendMsg(user, `You're spamming. Stop.`)
            return
        }

        timeLastCmd[user] = now

        const cmdName = match.groups.name
        const cmdArgs = match.groups.args?.split(' ') || []
        const cmd = cmds[cmdName]

        if (cmd) {
            cmd(user, cmdArgs)
        } else {
            sendMsg(user, `What is ${cmdName}? See /help.`)
        }
    })
}

// Respond to plain messages
function respondToMsgs() {
    const msgRegex = /^(?!\/\S).+/s

    bot.onText(msgRegex, (msg, _) => {
        const user = msg.chat.id
        sendMsg(user, msg.text)
    })
}

module.exports = {
    sendMsg, respondToCmds, respondToMsgs
}