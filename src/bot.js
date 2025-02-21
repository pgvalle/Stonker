const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const ssock = require('stocksocket') // https://github.com/gregtuc/StockSocket
const sql = require('sqlite3')

const TELEGRAM_BOT_TK = '8075711316:AAGaVXIGrthKWKsmnbtEAa4ocdLnw-qYLRY'
const botConfig = {
    polling: true,
    request: {
        agentOptions: {
            keepAlive: true,
            family: 4
        }
    }
}
const bot = new TelegramBot(TELEGRAM_BOT_TK, botConfig)
const db = new sql.Database('./stocks.db', sql.OPEN_READWRITE | sql.OPEN_CREATE);

// utils

function sendMessage(user, msg) {
    bot.sendMessage(user, msg, { parse_mode: 'Markdown' })
}

// creating tables

db.exec(`
    CREATE TABLE IF NOT EXISTS stock (
        MIC   VARCHAR(8) NOT NULL PRIMARY KEY,
        price REAL       NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS investment (
        stockMIC      VARCHAR(8) NOT NULL,
        user          INTEGER    NOT NULL,
        refStockPrice REAL       NOT NULL,
        value         REAL       NOT NULL,
        lowValue      REAL       NOT NULL,
        highValue     REAL       NOT NULL,
        PRIMARY KEY (stockMIC, user)
    );`
)

// Add a new entry in stock table. If the entry already exists, then update the price.
function updateStock(info) {
    const MIC = info.id
    const price = info.price
    const action = `INSERT OR REPLACE INTO stock (MIC, price) VALUES ('${MIC}', ${price})`

    db.exec(action, (_) => {
        // Stock price changes may affect investments
        updateInvestments(MIC, price)
    })
}

// update all investments on a stock with MIC=stockMIC based on its new price
function updateInvestments(stockMIC, stockPrice) {
    const newValue = `(${stockPrice} / refStockPrice) * value`
    const action = `
        UPDATE investment SET
        lowValue = CASE
            WHEN ${newValue} > highValue THEN highValue
            WHEN ${newValue} < lowValue  THEN 2 * lowValue - highValue
        END,
        highValue = CASE
            WHEN ${newValue} > highValue THEN 2 * highValue - lowValue
            WHEN ${newValue} < lowValue  THEN lowValue
        END
        WHERE stockMIC = '${stockMIC}' AND ${newValue} NOT BETWEEN lowValue AND highValue
        RETURNING *`
    
    db.all(action, (_, affectedInvestments) => {
        // Users should be notified of their affected investments
        for (const ai of affectedInvestments) {
            if (ai.lowValue === ai.value || ai.highValue === ai.value) {
                sendMessage(ai.user, `asdfasdf`)
            } else {
                const msg = formatInvestment(ai, stockPrice)
                sendMessage(ai.user, msg)
            }
        }
    })
}

// Formatted information of investment i
function formatInvestment(i, stockPrice) {
    const formatedRefStockPrice = i.refStockPrice.toFixed(2)
    const formatedNewStockPrice = stockPrice.toFixed(2)
    const formatedValue = i.value.toFixed(2)

    const diff = i.value * (stockPrice / i.refStockPrice - 1)
    const formatedDiff = (diff >= 0 ? '+' : '') + diff.toFixed(2)
    
    return '```\n' + `${i.stockMIC} stocks\n`
         + ` price when invested: $${formatedRefStockPrice}\n`
         + ` latest price: $${formatedNewStockPrice}\n`
         + ` investment: $${formatedValue}\n`
         + ` investment diff: $${formatedDiff}` + '```\n'
}

// Users may watch invalid stocks. That ends up adding invalid listeners.
function refreshStockListeners() {
    ssock.removeAllTickers() // Trash all listeners
    
    // If a listener had an associated entry in stock table, then it was valid. Re-add it.
    db.all(`SELECT * FROM stock`, (_, stocks) => {
        for (const s of stocks) {
            ssock.addTicker(s.MIC, updateStock)
        }
    })
}

// add listeners on startup
refreshStockListeners()
// refresh listeners every 30 seconds
setInterval(refreshStockListeners, 30000)

// bot commands

// TODO: fix me
function invest(user, args) {
    if (!args || args.length !== 3) {
        sendMessage(user, 'Wrong command syntax.')
        return
    }

    // TODO: validate inputs
    const stockMIC = args[0].toUpperCase()
    const value = Number(args[1])
    const diffValue = Number(args[2])
    const action = `
        INSERT OR REPLACE INTO investment (stockMIC, user, refStockPrice, value, lowValue, highValue)
        SELECT stock.MIC, ${user}, stock.price, ${value}, ${value}, ${value}+${diffValue}
        FROM stock WHERE stock.MIC = '${stockMIC}'
        RETURNING rowid`
    
    db.get(action, (_, result) => {
        if (result) {
            sendMessage(user, `${stockMIC} investment added.`)
        } else {
            ssock.addTicker(stockMIC, updateStock)
            sendMessage(user, `${stockMIC} not found. Try again later.`)
        }
    })
}

function dinvest(user, args) {
    var action = `DELETE FROM investment WHERE user = ${user}`
    var reply = 'Now all your investments are gone.'

    // no args mean delete all
    if (args) {
        const investments = `('` + args.join(`', '`).toUpperCase() + `')`
        action = `DELETE FROM investment WHERE stockMIC IN ${investments} AND user = ${user}`
        reply = 'Now those investments are gone.'
    }

    db.exec(action, (_) => {
        sendMessage(user, reply)
    })
}

function linvest(user, args) {
    var action = `SELECT investment.*, stock.price FROM investment INNER JOIN stock
                  ON investment.stockMIC = stock.MIC WHERE investment.user = ${user}`
    var reply = 'Here are all your investments'

    // list of investments to look for
    if (args) {
        const stockMICs = `('` + args.join(`, `).toUpperCase() + `')`
        action = `SELECT investment.*, stock.price FROM investment INNER JOIN stock
                  ON investment.stockMIC = stock.MIC
                  WHERE investment.user = ${user} AND stock.MIC IN ${stockMICs}`
        reply = 'Here are the investments you asked'
    }

    db.all(action, (_, joinInvestmentStock) => {
        for (const jis of joinInvestmentStock) {
            reply += formatInvestment(jis, jis.price)
        }
        const user = joinInvestmentStock[0].user
        sendMessage(user, reply)
    })
}

function stock(user, args) {
    var action = `SELECT * FROM stock`
    var reply = 'All stocks that I am aware of```\n'

    // list of stocks to look for
    if (args) {
        const stockMICs = `('` + args.join(`, `).toUpperCase() + `')`
        action = `SELECT * FROM stock WHERE MIC IN ${stockMICs}`
        reply = 'Stocks you wanted that I am aware of```\n'
    }

    db.all(action, (_, stocks) => {
        for (const s of stocks) {
            const formatedPrice = s.price.toFixed(2)
            reply += `${s.MIC} : $${formatedPrice}\n`
        }

        sendMessage(user, reply + '```')
    })
}

function help(user, args) {
    if (args) {
        sendMessage(user, 'Wrong command syntax.')
        return
    }

    const separator = '\n '
    const cmdsFmt = Object.keys(commands).join(separator)
    sendMessage(user, `Commands:${separator}${cmdsFmt}`)
}

var commands = {
    invest, linvest, dinvest, help, stock
}

// configure bot

bot.on('message', async (msg) => {
    const regex = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    const user = msg.chat.id
    const cmdInfo = msg.text.match(regex)?.groups

    const command = commands[cmdInfo?.name]
    if (cmdInfo && command) {
        const args = cmdInfo.args?.split(' ')
        command(user, args)
        return
    }
    
    if (cmdInfo) {
        sendMessage(user, 'what???')
        return
    }

    sendMessage(user, msg.text)
});
