const { Database, OPEN_READWRITE, OPEN_CREATE } = require('sqlite3')
const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const ssock = require('stocksocket') // https://github.com/gregtuc/StockSocket

// get token from environment variable
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// create database and bot
const db = new Database('./stocks.db', OPEN_READWRITE | OPEN_CREATE)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
    polling: true
})

// So that I don't need to worry about bloating the rest of my code with logging
function dbExecOrError(action, callback) {
    db.exec(action, async (err) => {
        if (err) {
            console.log(err.message)
        } else {
            await callback?.()
        }
    })
}

// Same here than above
function dbReturnOrError(action, callback) {
    db.all(action, async (err, ret) => {
        if (err) {
            console.log(err.message)
        } else {
            await callback?.(ret)
        }
    })
}

// send message with markdown formatting
async function sendMsg(user, msg) {
    await bot.sendMessage(user, msg, {
        parse_mode: 'Markdown'
    })
}

//  1: got updates
//  0: no updates
// -1: no updates, and users were notified
// var priceUpdateStatus = 1

// Users may try to invest on invalid stocks. That ends up adding invalid listeners.
function refreshStockListeners() {
    ssock.removeAllTickers() // Trash all listeners
    
    dbReturnOrError(`SELECT * FROM stock`, async (stocks) => {
        // If a listener had an associated entry in stock table, it was valid. Readd it.
        for (const s of stocks) {
            addStockListener(s.MIC)
        }
    })

    // if (priceUpdateStatus == 0) {
    //     dbReturnOrError(`SELECT DISTINCT user FROM investment`, async (investment) => {
    //         const reply = `The market might be closed...`
    //         for (const i of investment) {
    //             await sendMsg(i.user, reply)
    //         }
    //     })

    //     priceUpdateStatus = -1
    // } else if (priceUpdateStatus == 1) {
    //     priceUpdateStatus = 0
    // }
}

// Listen to a given stock
function addStockListener(stockMIC) {
    ssock.addTicker(stockMIC, async (stock) => {
        // Add this stock listener to stock table or update an an already existing entry.
        const action = `INSERT OR REPLACE INTO stock (MIC, price)
                        VALUES ('${stockMIC}', ${stock.price})`

        db.exec(action, async () => {
            // Stock price changes may affect investments
            await updateInvestments(stockMIC, stock.price)
        })

        // priceUpdateStatus = 1
    })
}

// update all investments on a given stock based on its new price
async function updateInvestments(stockMIC, stockPrice) {
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
    
    dbReturnOrError(action, async (affectedInvestments) => {
        // Users should be notified of their affected investments
        for (const i of affectedInvestments) {
            if (i.lowValue !== i.value && i.highValue !== i.value) {
                const msg = fmtInvestment(i, stockPrice)
                await sendMsg(i.user, msg)
            }
        }
    })
}

// Formatted information of a given investment i
function fmtInvestment(i, stockPrice) {
    const diff = i.value * (stockPrice / i.refStockPrice - 1)
    const param = i.highValue - i.lowValue

    const fmtDiff = (diff >= 0 ? '+' : '') + diff.toFixed(2)

    const fmtLow = i.lowValue.toFixed(2)
    const fmtHigh = i.highValue.toFixed(2)
    var fmtNotifyWhen = `< $${fmtLow} or > $${fmtHigh}`

    if (i.value === i.lowValue) {
        fmtNotifyWhen = `> $${fmtHigh}`
    } else if (i.value === i.highValue) {
        fmtNotifyWhen = `< $${fmtLow}`
    }
    
    return `*${i.stockMIC}*` + '```\n'
         + `price when invested: $${i.refStockPrice.toFixed(2)}\n`
         + `last known price: $${stockPrice.toFixed(2)}\n`
         + `investment: $${i.value.toFixed(2)}\n`
         + `diff: $${fmtDiff}\n`
         + `investment+diff: $${newValue.toFixed(2)}\n`
         + `variation watched: $${param.toFixed(2)}\n`
         + `notity when investment+diff ${fmtNotifyWhen}` + '```\n'
}

// exports

module.exports = {
    bot,
    dbExecOrError,
    dbReturnOrError,
    sendMsg,
    refreshStockListeners,
    addStockListener,
    fmtInvestment
}