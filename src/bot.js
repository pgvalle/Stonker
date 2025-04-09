const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const sock = require('stocksocket') // https://github.com/gregtuc/StockSocket
const db = require('./db')

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(TOKEN, { polling: true })

var user = null

// send message to user with markdown formatting
function sendMsg(str) {
    bot.sendMessage(user, str, { parse_mode: 'Markdown' })
}

// update stock info in db and notify user
function updateAndNotify(data) {
    const updated = db.updateStock(data.id, data.price)
    if (updated) sendMsg(updated.stockMIC)
}

// COMMANDS

const cmds = {}

cmds.a = async function (args) {
    if (args.length != 1) {
        sendMsg('Pass exactly one argument')
        return
    }

    const mic = args[0].toUpperCase()
    const added = db.addStock(mic)
    sock.addTicker(mic, updateAndNotify)
}

cmds.d = async function (args) {
    if (args.length != 1) {
        sendMsg('Pass exactly one argument')
        return
    }

    const mic = args[0].toUpperCase()
    sock.removeTicker(mic)
    const deleted = db.delStock(mic)
}

cmds.l = async function (args) {
    const stocks = db.getStocks()
    for (const stock of stocks) {
        sendMsg(JSON.stringify(stock))
    }
}

cmds.i = async function (args) {
    sendMsg('Not implemented yet')
}

// RUNNING

// get all stocks stored in db and add their tickers
const stocks = db.getStocks();
for (const stock of stocks) {
    sock.addTicker(stock.stockMIC, updateAndNotify);
}

// save user that sent the first message
bot.on('message', (msg) => {
    if (user) return
    user = msg.chat.id
    sendMsg('I registered you as my mommy')
})

// respond to plain messages. Just repeat what the user says.
const MSG_REGEX = /^(?!\/\S).+/s
bot.onText(MSG_REGEX, (msg) => {
    if (user != msg.chat.id) return
    sendMsg(msg.text)
})

// respond to commands defined
const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
bot.onText(CMD_REGEX, (msg, match) => {
    if (user != msg.chat.id) return

    const name = match.groups.name
    const args = match.groups.args?.split(' ') || []
    const cmd = cmds[name]

    if (cmd) cmd(args)
    else sendMsg(`What is ${name}?`)
})
