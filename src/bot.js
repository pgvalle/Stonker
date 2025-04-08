const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(TOKEN, {
    polling: true
})

var mommy = null

function ensureMommy() {
    console.assert(mommy, "I don't have a mommy")
}

// send message to mommy with markdown formatting
async function sendMsg(str) {
    ensureMommy()
    await bot.sendMessage(mommy, str, {
        parse_mode: 'Markdown'
    })
}

// commands

const { db, queries } = require('./db')
const cmds = {}

cmds.a = (args) => {
    ensureMommy()
    if (args.length != 1) {
        bot.sendMsg('Give 1 argument')
        return
    }

    // ...
}

// /a
// /d
// /l
// /i

// responding user

const MSG_REGEX = /^(?!\/\S).+/s
const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/

// respond to plain messages. Just repeat what the user says.
bot.onText(MSG_REGEX, (msg) => {
    const user = msg.chat.id
    if (!mommy) mommy = user // respond to only one user. Imprint
    sendMsg(user, msg.text)
})

// respond to commands defined
bot.onText(CMD_REGEX, (msg, match) => {
    ensureMommy()

    const user = msg.chat.id
    if (user != mommy) return

    const cmdName = match.groups.name
    const cmdArgs = match.groups.args?.split(' ') || []
    const cmd = cmds[cmdName]

    if (cmd) {
        cmd(user, cmdArgs)
    } else {
        sendMsg(`What is ${cmdName}? See /help.`)
    }
})
