const { db, queries } = require('./db')
const bot = require('./bot')
const sock = require('stocksocket') // https://github.com/gregtuc/StockSocket

// Listen to a given stock
function listenStock(MIC) {
    // each time MIC updates, execute the callback
    sock.addTicker(MIC.toUpperCase(), (stock) => {
        const params = {
            $MIC: stock.id,
            $price: stock.price,
            $time:  stock.time,
            $marketHours: stock.marketHours
        }
    
        db.serialize(() => {
            // insert (first time) or update stock in stock table
            db.run(queries.ADD_OR_UPDATE_STOCK, params)
            
            // notify user if investment value got out of range
            db.each(queries.GET_NOTIFY_STOCK_INVESTMENTS, params, (_, row) => {
                bot.sendMsg(row.MIC + ' $' + row.value)
            })
        })
    })
}

// User may try to invest on invalid stocks. That ends up adding invalid listeners.
function refreshStockListeners() {
    sock.removeAllTickers()

    // If a listener had an entry in stock table, it was valid. Readd it.
    db.each(queries.GET_ALL_STOCKS, (_, row) => {
        listenStock(row.MIC)
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
    listenStock, refreshStockListeners,
    fmtInvestment, fmtStock
}
