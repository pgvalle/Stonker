const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const sock = require('stocksocket') // https://github.com/gregtuc/StockSocket
const db = require('./db')

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(TOKEN, { polling: true })
const cmds = {}
var owner = null

// send message to owner with markdown formatting
async function sendMsg(str) {
    await bot.sendMessage(owner, str, { parse_mode: 'Markdown' })
}

// check if It's the owner
async function isOwner(user) {
    if (owner) {
        return owner == user
    }

    owner = user
    await sendMsg("You are my owner. Get help with `/h h`.")
    return false
}

// update stock info in db and notify owner
async function updateAndNotify(data) {
    const row = db.updateStock(data.id, data.price)
    if (!row) return;

    // TODO: do some proper formatting
    await sendMsg(row.stockTicker)
}

// round to 2 decimal places
function formatMoney(x) {
    return Number(Number(x).toFixed(2))
}

// prettify table row information
function formatRow(row, isUpdate) {
    // important info
    // ticker, price, value, value - initialvalue
    return `${row}`
}

const trivia = `
Tickers are unique codes that identify companies in trading markets.
Examples: AAPL (Apple), TSLA (Tesla), NVDA (NVidia)
`

// COMMANDS

cmds.h = async (args) => {
    if (args.length != 1) {
        await sendMsg("Wrong number of args.")
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

cmds.h.help = `
/h <thing>
  Help with a given "thing".
  - thing: h, a, d, s, m, ticker
  Example: /h ticker
`

cmds.a = async (args) => {
    if (args.length != 1) {
        await sendMsg("Wrong number of args.")
        return
    }

    const ticker = args[0].toUpperCase()
    const added = db.addStock(ticker)
    if (added) {
        sock.addTicker(ticker, updateAndNotify)
        await sendMsg(`Added ${ticker} to the watchlist.`)
    } else {
        await sendMsg(`${ticker} is already in the watchlist.`)
    }
}

cmds.a.help = `\`\`\`
/a <ticker>
  Add a ticker to the watchlist.
  Example: /a TSLA
\`\`\``

cmds.d = async (args) => {
    if (args.length != 1) {
        await sendMsg("Wrong number of args.")
        return
    }

    const ticker = args[0].toUpperCase()
    sock.removeTicker(ticker)

    const deleted = db.delStock(ticker)
    if (deleted) {
        await sendMsg(`Deleted ${ticker} from watchlist`)
    } else {
        await sendMsg(`${ticker} is not in the watchlist.`)
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
        await sendMsg("Wrong number of args.")
        return
    }

    if (args.length == 1) {
        const ticker = args[0].toUpperCase();
        const stock = db.getStock(ticker)
        if (stock) {
            await sendMsg(formatRow(stock))
        } else {
            await sendMsg(`${ticker} is not in the watchlist.`)
        }

        return
    }

    const stocks = db.getStocks()
    if (stocks.length == 0) {
        await sendMsg("Watchlist is empty.")
    } else {
        const msg = stocks.reduce((acc, stock) => {
            return acc + formatRow(stock)
        }, "")
        await sendMsg(msg)
    }
}

cmds.s.help = `\`\`\`
/s [ticker]
  Show info on a given ticker.
  No arg shows all known tickers.
  Examples:
    /s
    /s NVDA
\`\`\``

cmds.i = async (args) => {
    if (args.length < 3 || args.length > 4) {
        await sendMsg("Wrong number of args.")
        return
    }

    const value = formatMoney(args[1])
    if (isNaN(value) || value < 1 || value > 1000) {
        await sendMsg("value must be a number between $1.00 and $1000.00")
        return
    }

    const diff = formatMoney(args[2])
    if (isNaN(diff) || diff < 0.01) {
        await sendMsg("diff must be a number equal or greater than $1.00")
        return
    }

    const upDiff = (args[3] ? formatMoney(args[3]) : diff)
    if (isNaN(upDiff) || upDiff < 0.01) {
        await sendMsg("upDiff must be a number equal or greater than $1.00")
        return
    }

    const ticker = args[0].toUpperCase()
    const invested = db.invest(ticker, value, diff, upDiff)
    if (invested) {
        await sendMsg(`Invested $${value} in ${ticker}`)
    } else if (db.getStock(ticker)) {
        await sendMsg(`No price info on ${ticker} yet`)
    } else {
        await sendMsg(`${ticker} is not in the watchlist. Add it with \`/a ${ticker}\``)
    }
}

cmds.i.help = `\`\`\`
/i <ticker> <value> <diff> [upDiff]
  Invest and monitor value.
  Notify when it goes in/out of (value-diff,value+upDiff).
  - ticker: must be added with \`/a <ticker>\` first
  - value: must be between $1.00 and $1000.00
  - diff: must be equal or greater than $0.01
  - upDiff: upDiff=diff if ommited
  Examples:
    /i MSFT 500 5.00  → range: (475.00,525.00)
    /i GOOG 100 3 100 → range: (950.00,1100.00)
\`\`\``

// RUNNING

// start watching stocks i have on the db
for (const stock of db.getStocks()) {
    sock.addTicker(stock.stockTicker, updateAndNotify);
}

const MSG_REGEX = /^(?!\/\S).+/s
const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/

bot.onText(MSG_REGEX, async (msg) => {
    if (isOwner(msg.chat.id)) {
        await sendMsg(msg.text)
    }
})

bot.onText(CMD_REGEX, async (msg, match) => {
    if (!isOwner(msg.chat.id)) {
        return
    }

    const invalid = async (_) => {
        await sendMsg("I don't know this command. Try `/h h`.")
    }

    const cmd = cmds[match.groups.name] || invalid
    const args = match.groups.args?.split(" ") || []
    await cmd(args)
})
