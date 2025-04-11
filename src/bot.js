const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const sock = require('stocksocket') // https://github.com/gregtuc/StockSocket
const db = require('./db')

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(TOKEN, { polling: true })
const cmds = {}
const helps = {}

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

// HELPS

helps.trivia = `\`\`\`
Trivia: MIC stands for Market Identifier Code (e.g., NASDAQ:AAPL, TSLA)
\`\`\``

helps.h = `\`\`\`
/h <command>
  Help with given command.
  - command: h, a, d, s, m
  Example: /h h
\`\`\``

helps.a = `\`\`\`
/a <MIC>
  Add a stock to the watchlist.
  Example: /a NYSE:TSLA
\`\`\``

helps.d = `\`\`\`
/d <MIC>
  Delete a stock from the watchlist.
  Example: /d NYSE:TSLA
\`\`\``

helps.l = `\`\`\`
/s [MIC]
  Show info on given stock. No arg: all stocks.
  Examples:
    /l
    /l NVDA
\`\`\``

helps.m = `\`\`\`
/m <MIC> <amount> <delta> [upper_delta]
  Monitor a stock's value. Notify when it goes out of range.
  - MIC: must be added with '/a' first
  - amount: base value to monitor
  - delta: if upper_delta is omitted, uses ±delta
  - upper_delta (optional): if set, uses (amount - delta) to (amount + upper_delta)
  Examples:
    /i NASDAQ:MSFT 500 25    → range: 475–525
    /i NYSE:GOOG 1000 50 100 → range: 950–1100
\`\`\``

// COMMANDS

cmds.a = async (args) => {
    if (args.length != 1) {
        await cmds.h(['a'])
        return
    }

    const mic = args[0].toUpperCase()
    const added = db.addStock(mic)
    if (added) {
        sock.addTicker(mic, updateAndNotify)
        await sendMsg(`Added ${mic} to the watchlist`)
    } else await sendMsg(`${mic} is already in the watchlist`)
}

cmds.d = async (args) => {
    if (args.length != 1) {
        await cmds.h(['d'])
        return
    }

    const mic = args[0].toUpperCase()
    sock.removeTicker(mic)

    const deleted = db.delStock(mic)
    if (deleted) await sendMsg(`Deleted ${mic} from the watchlist`)
    else await sendMsg(`${mic} is not in the watchlist`)
}

// TODO: finish it
cmds.s = async (args) => {
    if (args.length > 1) {
        await cmds.h(['s'])
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
        await sendMsg(stocks.reduce((acc, stock) => {
            return acc + `{stock.stockMIC}\n`
        }, ''))
    } else if (args.length == 0) await sendMsg('Watchlist is empty')
    else await sendMsg('No such entry in watchlist')
}

// TODO: finish it here and in db
cmds.m = async (args) => {
    if (args.length < 3 || args.length > 4) {
        await cmds.h(['m'])
        return
    }

    const mic = args[0].toUpperCase()
    const value = financial(args[1])
    const diff = financial(args[2])

    if (value < 1 || diff < 0.01) {
        await cmds.h(['m'])
        return
    }

    const invested = db.invest(mic, value, diff)
    if (invested) await sendMsg(`Invested $${value} in ${mic} stocks`)
    else if (db.getStock(mic)) await sendMsg(`No price info on ${mic} stocks yet`)
    else await sendMsg(`${mic} is not in watchlist`)
}

cmds.h = async (args) => {
    if (args.length != 1) {
        await.sendMsg(helps.h)
        return
    }

    const name = args[0].toLowerCase()
    await sendMsg(helps.trivia)
    await sendMsg(helps[name] || `abadabada`)
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

    const name = match.groups.name
    const cmd = cmds[name] || (args) => { cmds.h([name]) }
    const args = match.groups.args?.split(' ') || []

    await cmd(args)
})
