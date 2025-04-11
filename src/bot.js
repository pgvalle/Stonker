const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const sock = require('stocksocket') // https://github.com/gregtuc/StockSocket
const db = require('./db')

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(TOKEN, { polling: true })
const cmds = {}

var user = null

// send message to user with markdown formatting
async function sendMsg(str) {
    await bot.sendMessage(user, str, { parse_mode: 'Markdown' })
}

// update stock info in db and notify user
async function updateAndNotify(data) {
    const row = db.updateStock(data.id, data.price)
    if (!row) return;

    await sendMsg(row.stockMIC)
}

// COMMANDS

cmds.a = async (args) => {
    if (args.length != 1) {
        await sendMsg('usage: `/a {stockMIC}`')
        return
    }

    const mic = args[0].toUpperCase()
    const added = db.addStock(mic)
    if (added) {
        sock.addTicker(mic, updateAndNotify)
    }
    await sendMsg(added ? 'ok' : 'not ok')
}

cmds.d = async (args) => {
    if (args.length != 1) {
        await sendMsg('usage: `/d {stockMIC}`')
        return
    }

    const mic = args[0].toUpperCase()
    sock.removeTicker(mic)
    const deleted = db.delStock(mic)
}

cmds.l = async (args) => {
    for (const stock of db.getStocks()) {
        await sendMsg(JSON.stringify(stock))
    }
}

cmds.i = async (args) => {
    if (args.length != 3) {
        await sendMsg('usage: `/i {stockMIC} {x.xx} {y.yy}`')
        return
    }

    const mic = args[0].toUpperCase()
    const value = parseFloat(parseFloat(args[1]).toFixed(2))
    const diff = parseFloat(parseFloat(args[2]).toFixed(2))
    db.invest(mic, value, diff)
}

// RUNNING

// start watching stocks i have on the db
for (const stock of db.getStocks()) {
    sock.addTicker(stock.stockMIC, updateAndNotify);
}

// register user that sent the first message
bot.on('message', async (msg) => {
    const newUser = msg.chat.id
    if (!user) {
        user = newUser
        await sendMsg('I registered you as my owner')
    } else if (user != newUser) {
        await sendMsg('You are not my owner')
    }
})

const MSG_REGEX = /^(?!\/\S).+/s
const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/

bot.onText(MSG_REGEX, async (msg) => {
    if (user != msg.chat.id) return
    await sendMsg(msg.text)
})

bot.onText(CMD_REGEX, async (msg, match) => {
    if (user != msg.chat.id) return

    const cmd = cmds[match.groups.name]
    const args = match.groups.args?.split(' ') || []

    if (cmd) await cmd(args)
    else await sendMsg('What???')
})
