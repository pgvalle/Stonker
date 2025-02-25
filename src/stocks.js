const { db, queries } = require('./db')
const bot = require('./bot')
const sock = require('stocksocket'); // https://github.com/gregtuc/StockSocket

// Listener for the given stock
function stockUpdater(stock) {
    db.serialize(() => {
        // insert (first time) or update stock in stock table
        db.run(queries.ADD_OR_UPDATE_STOCK, {
            $MIC: stock.id,
            $price: stock.price,
            $time:  stock.time,
            $marketHours: stock.marketHours
        })

        // check investments that need update based on new stock price
        // db.each(queries.UPDATE_INVESTMENTS_ON_STOCK, {
        //     $stockMIC: stock.id,
        //     $stockPrice: stock.price
        // }, async (err, investment) => {
        //     await bot.sendMsg(investment.user, JSON.stringify(investment))
        // })
    })
}

// Listen to a given stock
function addStockListener(MIC) {
    sock.addTicker(MIC, (stock) => {
        stockUpdater(stock)
    })
}

// Users may try to invest on invalid stocks. That ends up adding invalid listeners.
function refreshStockListeners() {
    sock.removeAllTickers() // Trash all listeners
    
    // If a listener had an entry in stock table, it was valid. Readd it.
    db.each(queries.GET_STOCKS, (err, stock) => {
        addStockListener(stock.MIC)
    })
}

module.exports = {
    addStockListener, refreshStockListeners
}


// // Formatted information of a given stock s
// function fmtStock(s) {
//     const date = new Date(s.time);

//     return `*${s.MIC}*` + '```\n'
//          + `last known price: $${s.price.toFixed(2)}\n`
//          + `time last price: ${date.toLocaleString()}\n`
//          + `market status: ${s.marketHours}\n` + '```\n'
// }

// // Formatted information of a given investment i
// function fmtInvestment(i, stockPrice, notification = undefined) {
//     const diff = i.value * (stockPrice / i.refStockPrice - 1)
//     const newValue = i.value + diff
//     const param = i.highValue - i.lowValue

//     const fmtNotify = notification ? 'Notification' : ''
//     const fmtDiff = (diff >= 0 ? '+' : '') + diff.toFixed(2)

//     var fmtLow = i.lowValue.toFixed(2)
//     var fmtHigh = i.highValue.toFixed(2)

//     if (i.lowValue === i.value) {
//         fmtLow = (i.lowValue - param).toFixed(2);
//     } else if (i.highValue === i.value) {
//         fmtHigh = (i.highValue + param).toFixed(2);
//     }

//     const fmtNotifyWhen = `<= $${fmtLow} or >= $${fmtHigh}`

//     return `*${i.stockMIC}` + fmtNotify + '*```\n'
//          + `investment: $${i.value.toFixed(2)}\n`
//          + `diff: $${fmtDiff}\n`
//          + `investment+diff: $${newValue.toFixed(2)}\n`
//          + `next notification when: ${fmtNotifyWhen}` + '```\n'
// }