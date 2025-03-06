const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api

// get token from environment variable
const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token, {
    polling: true
})

// only respond to the user that sent the first message
const user = {
    id: undefined,
    timeLastCmd: 0
}

// send message with markdown formatting
async function sendMsg(str) {
    await bot.sendMessage(user.id, str, {
        parse_mode: 'Markdown'
    })
}

// Respond commands, like /stock.
function respondToCmd(cmds) {
    const cmdRegex = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    const spamDelta = 2

    bot.onText(cmdRegex, (msg, match) => {
        // remember first user that sent message
        if (!user.id) {
            user.id = msg.chat.id
            console.log('Assigned user.')
        }

        // calculate time since last command
        const now = 0.001 * Date.now()
        const delta = now - user.timeLastCmd
        user.timeLastCmd = now

        // prevent spams
        if (delta < spamDelta) {
            const fmtTimeWait = (spamDelta - delta).toFixed(1)
            sendMsg(`Wait ${fmtTimeWait}s to send another command.`)
            return
        }

        let { name, args } = match.groups
        const cmd = cmds[name]

        if (cmd) {
            args = args?.split(' ') || []
            cmd(args)
        } else {
            sendMsg(`What is ${name}? See /help.`)
        }
    })
}

// Respond to plain messages
function respondToMsg() {
    const msgRegex = /^(?!\/\S).+/s

    bot.onText(msgRegex, (msg, _) => {
        const user = msg.chat.id
        sendMsg(msg.text)
    })
}

module.exports = {
    sendMsg, respondToCmd, respondToMsg
}