const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const ssock = require('stocksocket') // https://github.com/gregtuc/StockSocket
const sql = require('sqlite3')

const TELEGRAM_BOT_TK = '8075711316:AAGaVXIGrthKWKsmnbtEAa4ocdLnw-qYLRY'
const bot = new TelegramBot(TELEGRAM_BOT_TK, { polling: true })
const db = new sql.Database('./stocks.db', sql.OPEN_READWRITE | sql.OPEN_CREATE);

// creating tables

db.exec(`
    CREATE TABLE IF NOT EXISTS stock (
        stockId     VARCHAR(8) NOT NULL PRIMARY KEY,
        price       REAL       NOT NULL
    )`
)

db.exec(`CREATE TABLE IF NOT EXISTS watcher (
        stockId        VARCHAR(8) NOT NULL,
        chat           INTEGER    NOT NULL,
        referencePrice REAL       NOT NULL,
        investedValue  REAL       NOT NULL,
        low            REAL       NOT NULL,
        high           REAL       NOT NULL,
        PRIMARY KEY (stockId, chat)
    )`
)

// stock price update callback

function updateStock(info) {
    const stockId = info.id
    const newStockPrice = info.price
    const action = `INSERT OR REPLACE INTO stock (stockId, price)
                    VALUES ('${stockId}', ${newStockPrice})`

    db.exec(action, (_) => {
        updateStockWatchers(stockId, newStockPrice)
    })
}

// update respective stock watchers

function updateStockWatchers(stockId, newStockPrice) {
    const action = `
        UPDATE watcher SET
        low = CASE
            WHEN ${newStockPrice} / referencePrice > high THEN high
            WHEN ${newStockPrice} / referencePrice < low  THEN 2 * low - high
        END,
        high = CASE
            WHEN ${newStockPrice} / referencePrice > high THEN 2 * high - low
            WHEN ${newStockPrice} / referencePrice < low  THEN low
        END
        WHERE stockId = '${stockId}' AND ${newStockPrice} / referencePrice NOT BETWEEN low AND high
        RETURNING *`
    
    db.all(action, (_, watchers) => {
        notifyUsers(watchers, newStockPrice)
    })
}

// tell users what stocks changed according to watch parameters and current price

function notifyUsers(watchers, newStockPrice) {
    for (const w of watchers) {
        const rel = newStockPrice / w.referencePrice - 1

        const msg = `change in ${w.stockId} stocks\n`
                  + `rel=${100 * rel}%\n`
                  + `earn/loss=${w.investedValue * rel}\n`
                  + `ref=${w.referencePrice}\n`
                  + `cur=${newStockPrice}`

        const ms1 = `change in amd`

        bot.sendMessage(w.chat, msg)
    }
}

// setup stock monitoring for stocks already saved in database
// also keep sockets clean of invalid stockIds

function refreshSSockets() {
    ssock.removeAllTickers()
    
    db.all(`SELECT stockId FROM stock`, (_, stocks) => {
        for (const s of stocks) {
            ssock.addTicker(s.stockId, updateStock)
        }
    })
}

refreshSSockets()
setInterval(refreshSSockets, 30000)

// bot commands

function watch(chat, args) {
    if (!args || args.length !== 3) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    const changeRange = Number(args[1])
    const valueInvested = Number(args[2])
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
    const action = `SELECT * FROM stock WHERE stockId = '${stockId}'`

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
                    referencePrice, investedValue, low, high)
                VALUES ('${stockId}', ${chat}, ${row.price},
                    ${valueInvested}, ${1-changeRange}, ${1+changeRange})`

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
            msg += ` ref=${w.referencePrice}\n`
            msg += ` invested=${w.investedValue}\n`
            msg += ` low=${100 * (w.low - 1)}%\n`
            msg += ` high=${100 * (w.high - 1)}%\n`
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
    const action = `SELECT * FROM stock WHERE stockId = '${stockId}'`

    db.get(action, (_, s) => {
        bot.sendMessage(chat, `id: ${s.stockId}\nprice: ${s.price}`)
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
