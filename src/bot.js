const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const ssock = require('stocksocket') // https://github.com/gregtuc/StockSocket
const sql = require('sqlite3')

const TELEGRAM_BOT_TK = '8075711316:AAGaVXIGrthKWKsmnbtEAa4ocdLnw-qYLRY'
const bot = new TelegramBot(TELEGRAM_BOT_TK, { polling: true })
const db = new sql.Database('./stocks.db', sql.OPEN_READWRITE | sql.OPEN_CREATE);

// creating tables

db.exec(`
    CREATE TABLE IF NOT EXISTS stock (
        id    VARCHAR(8) NOT NULL PRIMARY KEY,
        price REAL       NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS investment (
        stockId       VARCHAR(8) NOT NULL,
        chat          INTEGER    NOT NULL,
        refStockPrice REAL       NOT NULL,
        value         REAL       NOT NULL,
        lowValue      REAL       NOT NULL,
        highValue     REAL       NOT NULL,
        PRIMARY KEY (stockId, chat)
    );`
)

// Add a new entry in stock table. If the entry already exists, then update the price.
function updateStock(info) {
    const id = info.id
    const newPrice = info.price
    const action = `INSERT OR REPLACE INTO stock (id, price) VALUES ('${id}', ${newPrice})`

    db.exec(action, (_) => {
        // Stock price changes may affect investments
        updateInvestments(id, newPrice)
    })
}

// update all investments on a stock with id=stockId based on its new price
function updateInvestments(stockId, newStockPrice) {
    const newValue = `(${newStockPrice} / refStockPrice) * value`
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
        WHERE stockId = '${stockId}' AND ${newValue} NOT BETWEEN lowValue AND highValue
        RETURNING *`
    
    db.all(action, (_, affectedInvestments) => {
        // Users should be notified of their affected investments
        for (const ai of affectedInvestments) {
            notifyUser(ai, newStockPrice)
        }
    })
}

// Notify users of their investments affected by the new stock price
function notifyUser(investment, newStockPrice) {
    const { stockId, refStockPrice, investedValue } = investment
    const change = newStockPrice / refStockPrice - 1
    const gainLoss = (investedValue * change)

    const msg = `change in ${stockId} stocks\n`
              + `referencePrice=$${refStockPrice.toPrecision(2)}\n`
              + `price=$${newStockPrice.toPrecision(2)}\n`
              + `invested=$${investedValue.toPrecision(2)}\n`
              + `gain/loss=$${gainLoss.toPrecision(2)}\n`

    bot.sendMessage(w.chat, msg)
}

// Users may watch invalid stocks. That ends up adding invalid listeners.
function refreshStockListeners() {
    ssock.removeAllTickers() // Trash all listeners
    
    // If a listener had an associated entry in stock table, then it was valid. Re-add it.
    db.all(`SELECT id FROM stock`, (_, stocks) => {
        for (const s of stocks) {
            ssock.addTicker(s.id, updateStock)
        }
    })
}

// add listeners on startup
refreshStockListeners()
// refresh listeners every 30 seconds
setInterval(refreshStockListeners, 30000)

// bot commands

// TODO: fix me
function watch(chat, args) {
    if (!args || args.length !== 4) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    const investedValue = Number(args[1])
    // changeRange = Math.abs(parseFloat(changeRange))

    // if (isNaN(changeRange)) {
    //     bot.sendMessage(chat, `${args[1]} is not a number bro.`)
    //     return
    // }

    // if (changeRange < 0.0001) {
    //     bot.sendMessage(chat, `That number is too small bro`)
    //     return
    // }
    
    const stockId = args[0].toUpperCase()
    const action = `SELECT * FROM stock WHERE id = '${stockId}'`

    db.get(action, (_, row) => {
        if (!row) {
            bot.sendMessage(chat, `${stockId} not found. Try again later.`)
            ssock.addTicker(stockId, updateStock)
            return
        }

        console.log(1-changeRange)
        console.log(1+changeRange)
       const action = `
               INSERT OR REPLACE INTO watcher (stockId, chat,
                    refStockPrice, investedValue, lowValue, highValue)
                VALUES ('${stockI}', ${chat}, ${row.price},
                    ${investedVale}, ${1-changeRange}, ${1+changeRange})`
        db.exec(action, (_) => {
            bot.sendMessage(chat, `${stockId} watcher added.`)
        })
    })
}

function forget(chat, args) {
    var action = `DELETE FROM watcher WHERE chat = ${chat}`
    var reply = 'All watchers deleted.'
    
    // no args mean delete all
    if (args) {
        const watchers = `('` + args.join(`', '`).toUpperCase() + `')`
        action = `DELETE FROM watcher WHERE stockId IN ${watchers} AND chat = ${chat}`
        reply = 'Deleted specified watchers.'
    }

    db.exec(action, (_) => {
        bot.sendMessage(chat, reply)
    })
}

function info(chat, args) {
    if (!args || args.length !== 1) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    bot.sendMessage(chat, 'Comming soon...')
}

// TODO: fix me
function list(chat, args) {
    if (args) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    const action = `SELECT * FROM watcher WHERE chat = ${chat}`

    db.all(action, (_, watchers) => {
        const msgOpts = { parse_mode: 'MarkdownV2' }
        var msg = 'Here are all your watchers\n```'

        for (const w of watchers) {
            msg += `${w.stockId}:\n`
            msg += ` ref=${w.refStockPrice}\n`
            msg += ` invested=${w.investedalue}\n`
            msg += ` lowValue=${100 * (w.lwValue - 1)}%\n`
            msg += ` highValue=${100 * (w.ighValue - 1)}%\n`
        }

        bot.sendMessage(chat, msg + '```\n', msgOpts)
    })
}

function stock(chat, args) {
    if (!args || args.length !== 1) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    const stockId = args[0].toUpperCase()
    const action = `SELECT * FROM stock WHERE id = '${stockId}'`

    db.get(action, (_, s) => {
        bot.sendMessage(chat, `id: ${s.id}\nprice: ${s.price}`)
    })
}

function help(chat, args) {
    if (args) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    const separator = '\n - '
    const cmdsFmt = Object.keys(commands).join(separator)
    bot.sendMessage(chat, `Commands:${separator}${cmdsFmt}`)
}

var commands = {
    watch, forget, help, list, stock
}

// configure bot

bot.on('message', (msg) => {
    const regex = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    const chat = msg.chat.id
    const cmdInfo = msg.text.match(regex)?.groups

    const command = commands[cmdInfo?.name]
    if (cmdInfo && command) {
        const args = cmdInfo.args?.split(' ')
        command(chat, args)
        return
    }
    
    if (cmdInfo) {
        bot.sendMessage(chat, 'what???')
        return
    }

    bot.sendMessage(chat, msg.text)
});
