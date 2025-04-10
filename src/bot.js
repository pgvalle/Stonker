const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const sock = require('stocksocket') // https://github.com/gregtuc/StockSocket
const db = require('./db')

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(TOKEN, { polling: true })
const botCmds = {}

var user = null

// send message to user with markdown formatting
async function sendMsg(str) {
    await bot.sendMessage(user, str, { parse_mode: 'Markdown' })
}

// update stock info in db and notify user
async function updateAndNotify(data) {
    const updated = db.updateStock(data.id, data.price)
    if (updated) {
        await sendMsg(`${updated.stockMIC} updated!`)
    }
}

// COMMANDS

botCmds.a = async function (args) {
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

botCmds.d = async function (args) {
    if (args.length != 1) {
        await sendMsg('usage: `/d {stockMIC}`')
        return
    }

    const mic = args[0].toUpperCase()
    sock.removeTicker(mic)
    const deleted = db.delStock(mic)
}

botCmds.l = async function (args) {
    const stocks = db.getStocks()
    for (const stock of stocks) {
        await sendMsg(JSON.stringify(stock))
    }
}

botCmds.i = async function (args) {
    if (args.length != 3) {
        await sendMsg('usage: `/i {stockMIC} {x.xx} {y.yy}`')
        return
    }

    const mic = args[0].toUpperCase()
    const value = parseFloat(parseFloat(args[1]).toFixed(2))
    const diff = parseFloat(parseFloat(args[2]).toFixed(2))
    console.log(mic)
    console.log(value)
    console.log(diff)
    console.log(db.invest(mic, value, diff))
}

// RUNNING

// get all stocks stored in db and add their tickers
for (const stock of db.getStocks()) {
    sock.addTicker(stock.stockMIC, updateAndNotify);
}

// respond to plain messages. Just repeat what the user says.
const MSG_REGEX = /^(?!\/\S).+/s
bot.onText(MSG_REGEX, async (msg) => {
    if (!user) {
        user = msg.chat.id
        await sendMsg('I registered you as my mommy')
    }

    if (user != msg.chat.id) return
    await sendMsg(msg.text)
})

// respond to commands defined
const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
bot.onText(CMD_REGEX, async (msg, match) => {
    if (!user) {
        user = msg.chat.id
        await sendMsg('I registered you as my mommy')
    }

    const name = match.groups.name
    const args = match.groups.args?.split(' ') || []
    const cmd = cmds[name]

    if (cmd) await cmd(args)
    else await sendMsg(`What is ${name}?`)
})
