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

// send message with markdown formatting
async function sendMessage(user, msg) {
    bot.sendMessage(user, msg, {
        parse_mode: 'Markdown'
    })
}

// Users may try to invest on invalid stocks. That ends up adding invalid listeners.
function refreshStockListeners() {
    ssock.removeAllTickers() // Trash all listeners
    
    db.all(`SELECT * FROM stock`, async (_, stocks) => {
        // If a listener had an associated entry in stock table, it was valid. Readd it.
        for (const s of stocks) {
            addStockListener(s.MIC)
        }
    })
}

// Listen to a given stock
function addStockListener(stockMIC) {
    ssock.addTicker(s.MIC, async (info) => {
        const MIC = info.id
        const price = info.price
        // Add this stock listener to stock table or update an an already existing entry.
        const action = `INSERT OR REPLACE INTO stock (MIC, price)
                        VALUES ('${MIC}', ${price})`

        db.exec(action, async (_) => {
            // Stock price changes may affect investments
            await updateInvestments(MIC, price)
        })
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
    
    db.all(action, async (_, affectedInvestments) => {
        // Users should be notified of their affected investments
        for (const ai of affectedInvestments) {
            if (ai.lowValue !== ai.value && ai.highValue !== ai.value) {
                const msg = fmtInvestment(ai, stockPrice)
                await sendMessage(ai.user, msg)
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
    db,
    bot,
    sendMessage,
    refreshStockListeners,
    addStockListener,
    fmtInvestment
}