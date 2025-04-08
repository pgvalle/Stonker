const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const sock = require('stocksocket') // https://github.com/gregtuc/StockSocket

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(TOKEN, {
    polling: true
})

var user = null

// send message to user with markdown formatting
async function sendMsg(str) {
    await bot.sendMessage(user, str, {
        parse_mode: 'Markdown'
    })
}

// stock monitoring



// commands

const { db, queries } = require('./db')
const cmds = {}

cmds.a = (args) => {
    if (args.length != 1) {
        bot.sendMsg('Give 1 argument')
        return
    }

    db.run(queries.ADD_STOCK, { $MIC: args[0] }, (res, err) => {
        if (err) sendMsg("Error")
        else sendMsg("Alright")
    })
}

cmds.d = (args) => {
    if (args.length != 1) {
        bot.sendMsg('Give 1 argument')
        return
    }

    db.run(queries.DEL_STOCK, { $MIC: args[0] }, (res, err) => {
        if (err) sendMsg("Error")
        else sendMsg("Alright")
    })
}

cmds.l = (args) => {
    sendMsg("Not implemented yet")
}

cmds.i = (args) => {
    sendMsg("Not implemented yet")
}

// responding user

const MSG_REGEX = /^(?!\/\S).+/s
const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/

// respond to plain messages. Just repeat what the user says.
bot.onText(MSG_REGEX, (msg) => {
    if (!user) user = msg.chat.id
    if (user != msg.chat.id) return;
    
    sendMsg(user, msg.text)
})

// respond to commands defined
bot.onText(CMD_REGEX, (msg, match) => {
    if (!user) user = msg.chat.id
    if (user != msg.chat.id) return;

    const cmdName = match.groups.name
    const cmdArgs = match.groups.args?.split(' ') || []
    const cmd = cmds[cmdName]

    if (cmd) {
        cmd(cmdArgs)
    } else {
        sendMsg(`What is ${cmdName}?`)
    }
})
