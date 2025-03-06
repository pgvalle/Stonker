const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api

// get token from environment variable
const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token, {
    polling: true
})

// only one user
const mommy = {
    id: undefined,
    timeLastCmd: 0
}

// the user is going to be the one that sent the first message
function imprint(msg) {
    const id = msg.chat.id

    if (!mommy.id) {
        mommy.id = id
        sendMsg('Mommyyyyyyyyyyyyyyyy.')
    } else if (mommy.id != id) {
        sendMsg('Mommy, a stranger tried to talk to me.')
    }
}

// send message with markdown formatting
async function sendMsg(str) {
    await bot.sendMessage(mommy.id, str, {
        parse_mode: 'Markdown'
    })
}

function setupResponses(cmds) {
    const msgRegex = /^(?!\/\S).+/s

    // respond to normal messages with this callback
    bot.onText(msgRegex, (msg, _) => {
        imprint(msg)
        sendMsg(msg.text)
    })

    const cmdRegex = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    const cmdSpamDelta = 2

    // Respond commands, like /stock, with this callback
    bot.onText(cmdRegex, (msg, match) => {
        imprint(msg)

        const timenow = 0.001 * Date.now()
        const time2wait = cmdSpamDelta - (timenow - user.timeLastCmd)
        user.timeLastCmd = timenow

        if (time2wait > 0) {
            sendMsg(`Wait ${time2wait.toFixed(1)}s to send another command.`)
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

module.exports = {
    sendMsg, setupResponses
}