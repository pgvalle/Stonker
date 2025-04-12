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

// round to 2 decimal places
function financial(x) {
    return Number(Number(x).toFixed(2))
}

const trivia = `
Tickers are unique codes that identify companies in trading markets.
Examples: AAPL (Apple), TSLA (Tesla), NVDA (NVidia)
`

// COMMANDS

cmds.h = async (args) => {
    if (args.length != 1) {
        await sendMsg(cmds.h.help)
        return
    }

    const thing = args[0].toLowerCase()
    if (thing == "ticker") {
        await sendMsg(trivia)
    } else {
        const help = cmds[thing]?.help
        await sendMsg(help || "I don't know this thing.")
    }
}

cmds.h.help = `\`\`\`
/h <thing>
  Help with a given "thing".
  - thing: h, a, d, s, m, ticker
  Example: /h ticker
\`\`\``

cmds.a = async (args) => {
    if (args.length != 1) {
        await sendMsg(cmds.a.help)
        return
    }

    const mic = args[0].toUpperCase()
    const added = db.addStock(mic)
    if (added) {
        sock.addTicker(mic, updateAndNotify)
        await sendMsg(`Added ${mic} to the watchlist.`)
    } else {
        await sendMsg(`${mic} is already in the watchlist.`)
    }
}

cmds.a.help = `\`\`\`
/a <ticker>
  Add a ticker to the watchlist.
  Example: /a TSLA
\`\`\``

cmds.d = async (args) => {
    if (args.length != 1) {
        await sendMsg(cmds.d.help)
        return
    }

    const mic = args[0].toUpperCase()
    sock.removeTicker(mic)

    const deleted = db.delStock(mic)
    if (deleted) {
        await sendMsg(`Deleted ${mic} from the watchlist`)
    } else {
        await sendMsg(`${mic} is not in the watchlist`)
    }
}

cmds.d.help = `\`\`\`
/d <ticker>
  Delete a ticker from the watchlist.
  Example: /d TSLA
\`\`\``

// TODO: finish it
cmds.s = async (args) => {
    if (args.length > 1) {
        await sendMsg(cmds.s.help)
        return
    }

    var stocks = []
    if (args.length == 0) {
        stocks = db.getStocks()
    } else {
        const name = args[0].toUpperCase();
        const stock = db.getStock(name)
        stocks.push(stock)
    }

    if (stocks.length > 0) {
        const msg = stocks.reduce((acc, stock) => {
            return acc + `${stock.stockMIC}\n`
        }, "")
        await sendMsg(msg)
    } else if (args.length == 0) {
        await sendMsg("Watchlist is empty")
    } else {
        await sendMsg("No such entry in watchlist")
    }
}

cmds.s.help = `\`\`\`
/s [ticker]
  Show info on given ticker. No arg: all known tickers.
  Examples:
    /s
    /s NVDA
\`\`\``

// TODO: finish it here and in db
cmds.m = async (args) => {
    if (args.length < 3 || args.length > 4) {
        await sendMsg(cmds.m.help)
        return
    }

    const mic = args[0].toUpperCase()
    const value = financial(args[1])
    const diff = financial(args[2])

    if (value < 1 || diff < 0.01) {
        await sendMsg(cmds.m.help)
        return
    }

    const invested = db.invest(mic, value, diff)
    if (invested) {
        await sendMsg(`Invested $${value} in ${mic}`)
    } else if (db.getStock(mic)) {
        await sendMsg(`No price info on ${mic} yet`)
    } else {
        await sendMsg(`${mic} is not in watchlist`)
    }
}

cmds.m.help = `\`\`\`
/m <ticker> <value> <diff> [upper_diff]
  Monitor a stock's value. Notify when it goes in/out of range.
  - ticker: must be added with '/a' first
  - value: base value to monitor
  - diff: (value-diff,value+diff) is the range.
  - upper_diff: Optional. If given, (value-diff,value+upper_diff) is the range.
  Examples:
    /m MSFT 500 25      → range: (475,525)
    /m GOOG 1000 50 100 → range: (950,1100)
\`\`\``

// RUNNING

// start watching stocks i have on the db
for (const stock of db.getStocks()) {
    sock.addTicker(stock.stockMIC, updateAndNotify);
}

// register user that sent the first message
bot.on("message", async (msg) => {
    const aUser = msg.chat.id
    if (!user) {
        user = aUser
        await sendMsg("I registered you as my owner")
    } else if (user != aUser) {
        await sendMsg("You are not my owner")
    }
})

const MSG_REGEX = /^(?!\/\S).+/s
const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/

bot.onText(MSG_REGEX, async (msg) => {
    if (user == msg.chat.id) {
        await sendMsg(msg.text)
    }
})

bot.onText(CMD_REGEX, async (msg, match) => {
    if (user != msg.chat.id) {
        return
    }

    const invalid = async (_) => {
        await sendMsg("I don't know this command. Try `/h h`.")
    }

    const cmd = cmds[match.groups.name] || invalid
    const args = match.groups.args?.split(" ") || []
    await cmd(args)
})
