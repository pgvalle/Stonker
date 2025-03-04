const { db, queries } = require('./db')
const bot = require('./bot')
const sock = require('stocksocket') // https://github.com/gregtuc/StockSocket

// Updates stock table each time a new price is know
function stockUpdater(stock) {
    db.serialize(() => {
        // insert (first time) or update stock in stock table
        db.run(queries.ADD_OR_UPDATE_STOCK, {
            $MIC: stock.id,
            $price: stock.price,
            $time:  stock.time,
            $marketHours: stock.marketHours
        })

        // notify user if min gain or max loss were reached (out of range)
        db.each(queries.GET_NOTIFY_STOCK_INVESTMENTS, {
            $MIC: stock.id
        }, (err, row) => {
            bot.sendMsg(row.user, row.MIC + ' $' + row.value)
        })
    })
}

// Listen to a given stock
function addStock(MIC) {
    sock.addTicker(MIC.toUpperCase(), stockUpdater)
}

// Users may try to invest on invalid stocks. That ends up adding invalid listeners.
function refreshStockListeners() {
    sock.removeAllTickers() // Trash all listeners

    // If a listener had an entry in stock table, it was valid. Readd it.
    db.each(queries.GET_ALL_STOCKS, (err, row) => {
        addStock(row.MIC)
    })

    // Do this forever
    setTimeout(refreshStockListeners, 30000)
}

// format investment
function fmtInvestment(i) {
    return `${i.MIC}`
}

function fmtStock(s) {
    return `${s.MIC}`
}

module.exports = {
    addStock, refreshStockListeners, fmtInvestment, fmtStock
}
