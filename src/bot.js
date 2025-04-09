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

// commands

const cmds = {}

cmds.a = function (args) {
    sendMsg('Not implemented yet')
}

cmds.d = function (args) {
    sendMsg('Not implemented yet')
}

cmds.l = function (args) {
    sendMsg('Not implemented yet')
}

cmds.i = function (args) {
    sendMsg('Not implemented yet')
}

async function start() {
    await db.init()

    setInterval(async () => {
        sock.removeAllTickers()

        // get all stocks stored in db and add their tickers
        const stocks = await db.getStocks();
        for (const stock in stocks) {
            sock.addTicker(stock.stockMIC, db.updateStock);
        }
    }, 30000)

    // respond to plain messages. Just repeat what the user says.
    const MSG_REGEX = /^(?!\/\S).+/s
    bot.onText(MSG_REGEX, (msg) => {
        if (!user) user = msg.chat.id
        if (user != msg.chat.id) return
        sendMsg(msg.text)
    })
    
    // respond to commands defined
    const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    bot.onText(CMD_REGEX, (msg, match) => {
        if (!user) user = msg.chat.id
        if (user != msg.chat.id) return

        const name = match.groups.name
        const args = match.groups.args?.split(' ') || []
        const cmd = cmds[name]

        if (cmd) cmd(args)
        else sendMsg(`What is ${name}?`)
    })
}

start()
