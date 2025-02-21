const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const ssock = require('stocksocket') // https://github.com/gregtuc/StockSocket
const sql = require('sqlite3')

const TELEGRAM_BOT_TK = '8075711316:AAGaVXIGrthKWKsmnbtEAa4ocdLnw-qYLRY'
const bot = new TelegramBot(TELEGRAM_BOT_TK, { polling: true })
const db = new sql.Database('./stocks.db', sql.OPEN_READWRITE | sql.OPEN_CREATE);

// utils

function sendMessage(user, msg) {
    sendMessage(user, msg, { parse_mode: 'MarkdownV2' })
}

// creating tables

db.exec(`
    CREATE TABLE IF NOT EXISTS stock (
        MIC   VARCHAR(4) NOT NULL PRIMARY KEY,
        price REAL       NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS investment (
        stockMIC      VARCHAR(4) NOT NULL,
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
    const MIC = info.MIC
    const newPrice = info.price
    const action = `INSERT OR REPLACE INTO stock (MIC, price) VALUES ('${MIC}', ${newPrice})`

    db.exec(action, (_) => {
        // Stock price changes may affect investments
        updateInvestments(MIC, newPrice)
    })
}

// update all investments on a stock with MIC=stockMIC based on its new price
function updateInvestments(stockMIC, newStockPrice) {
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
        WHERE stockMIC = '${stockMIC}' AND ${newValue} NOT BETWEEN lowValue AND highValue
        RETURNING *`
    
    db.all(action, (_, affectedInvestments) => {
        // Users should be notified of their affected investments
        for (const ai of affectedInvestments) {
            const msg = formatInvestment(ai, newStockPrice)
            sendMessage(ai.user, msg)
        }
    })
}

// Formatted information of investment i
function formatInvestment(i, newStockPrice) {
    const formatedRefStockPrice = i.refStockPrice.toPrecision(2)
    const formatedNewStockPrice = i.newStockPrice.toPrecision(2)
    const formatedValue = i.value.toPrecision(2)

    const change = (newStockPrice / i.refStockPrice - 1)
    const formatedDiff = (change >= 0 ? '+' : '-') + (i.value * change).toPrecision(2)
    
    return `change in ${i.stockMIC} stocks\n`
         + `price when you invested: $${formatedRefStockPrice}\n`
         + `most recent price: $${formatedNewStockPrice}\n`
         + `investment: $${formatedValue}\n`
         + `investment diff: $${formatedDiff}\n`
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
    if (!args || args.length < 2) {
        sendMessage(user, 'Wrong command syntax.')
        return
    }

    const value = Number(args[1])
    // changeRange = Math.abs(parseFloat(changeRange))

    // if (isNaN(changeRange)) {
    //     sendMessage(user, `${args[1]} is not a number bro.`)
    //     return
    // }

    // if (changeRange < 0.0001) {
    //     sendMessage(user, `That number is too small bro`)
    //     return
    // }
    
    const stockMIC = args[0].toUpperCase()
    const action = `SELECT * FROM stock WHERE MIC = '${stockMIC}'`

    db.get(action, (_, row) => {
        if (!row) {
            sendMessage(user, `${stockMIC} not found. Try again later.`)
            ssock.addTicker(stockMIC, updateStock)
            return
        }

        console.log(1-changeRange)
        console.log(1+changeRange)
       const action = `
               INSERT OR REPLACE INTO investment (stockMIC, user,
                    refStockPrice, value, lowValue, highValue)
                VALUES ('${stockI}', ${user}, ${row.price},
                    ${investedVale}, ${1-changeRange}, ${1+changeRange})`
        db.exec(action, (_) => {
            sendMessage(user, `${stockMIC} investment added.`)
        })
    })
}

function forget(user, args) {
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

// TODO: fix me
function list(user, args) {
    // if (args) {
    //     sendMessage(user, 'Wrong command syntax.')
    //     return
    // }

    // const action = `SELECT investment.*, stock.price FROM investment LEFT INNER JOIN stock
    //                 ON investment.stockMIC = stock.MIC WHERE investment.user = ${user}`

    // db.all(action, (_, investments) => {
    //     var msg = 'Here are all your investments\n```'

    //     for (const w of investments) {
    //         msg += `${w.stockMIC}:\n`
    //         msg += ` ref=${w.refStockPrice}\n`
    //         msg += ` invested=${w.investedalue}\n`
    //         msg += ` lowValue=${w.lowValue}%\n`
    //         msg += ` highValue=${w.highValue}%\n`
    //     }

    //     sendMessage(user, msg + '```\n')
    // })
}

function stock(user, args) {
    var action = `SELECT * FROM stock`
    var reply = 'All stocks that I am aware of\n```'

    // existing arguments means list those specified
    if (args) {
        const stockMICs = `('` + args.join(`, `) + `')`
        action = `SELECT * FROM stock WHERE MIC IN ${stockMICs}`
        reply = 'Stocks you wanted that I am aware of\n```'
    }

    db.all(action, (_, stocks) => {
        for (const s of stocks) {
            const formatedMIC = s.MIC.padEnd(4, ' ')
            const formatedPrice = s.price.toPrecision(2)
            reply += `${formatedMIC} : $${formatedPrice}\n`
        }

        sendMessage(user, reply + '```')
    })
}

function help(user, args) {
    if (args) {
        sendMessage(user, 'Wrong command syntax.')
        return
    }

    const separator = '\n - '
    const cmdsFmt = Object.keys(commands).join(separator)
    sendMessage(user, `Commands:${separator}${cmdsFmt}`)
}

var commands = {
    invest, forget, help, list, stock
}

// configure bot

bot.on('message', (msg) => {
    const regex = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    const user = msg.user.id
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
