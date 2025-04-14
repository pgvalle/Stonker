const Database = require('better-sqlite3')
const db = new Database('./investments.db')

// db setup
db.prepare(`
    CREATE TABLE IF NOT EXISTS investment (
        stockTicker  VARCHAR(8) NOT NULL,
        stockPrice   REAL,
        initialValue REAL,
        value        REAL,
        minValue     REAL,
        maxValue     REAL,
        PRIMARY KEY (stockTicker)
    )`
).run()

// EXPORTS

exports.getStock = (ticker) => {
    return db.prepare(`
        SELECT * FROM investment
        WHERE stockTicker == @ticker`
    ).get({ ticker })
}

exports.getStocks = () => {
    return db.prepare('SELECT * FROM investment').all()
}

exports.addStock = (ticker) => {
    return db.prepare(`
        INSERT INTO investment (stockTicker) VALUES (@ticker)
        ON CONFLICT(stockTicker) DO NOTHING
        RETURNING *`
    ).get({ ticker })
}

exports.delStock = (ticker) => {
    return db.prepare(`
        DELETE FROM investment
        WHERE stockTicker == @ticker
        RETURNING *`
    ).get({ ticker })
}

exports.updateStock = db.transaction((ticker, price) => {
    const b4 = exports.getStock(ticker)
    const now = db.prepare(`
        UPDATE investment SET
            stockPrice = @price,
            value = value * @price / stockPrice
        WHERE stockTicker == @ticker
        RETURNING *`
    ).get({ ticker, price })

    const inRangeX = (v, min, max) => {
        return min < v && v < max
    }

    const inRangeB4 = inRangeX(b4.value, b4.minValue, b4.maxValue)
    const inRangeNow = inRangeX(now.value, now.minValue, now.maxValue)
    return (inRangeB4 == inRangeNow) ? undefined : now
})

exports.invest = (ticker, value, diff, upDiff) => {
    return db.prepare(`
        UPDATE investment SET
            initialValue = @value,
            value = @value,
            minValue = @value - @diff,
            maxValue = @value + @upDiff
        WHERE stockTicker == @ticker AND stockPrice IS NOT NULL
        RETURNING *`
    ).get({ ticker, value, diff, upDiff })
}
