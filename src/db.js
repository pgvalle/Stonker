const Database = require('better-sqlite3')
const db = new Database('./investments.db')

// db setup
db.prepare(`
    CREATE TABLE IF NOT EXISTS investment (
        stockMIC     VARCHAR(8) NOT NULL,
        stockPrice   REAL,
        initialValue REAL,
        value        REAL,
        minValue     REAL,
        maxValue     REAL,
        PRIMARY KEY (stockMIC)
    )`
).run()

// EXPORTS

exports.getStocks = () => {
    return db.prepare('SELECT * FROM investment').all()
}

exports.addStock = (mic) => {
    return db.prepare(`
        INSERT INTO investment (stockMIC) VALUES (@mic)
        ON CONFLICT(stockMIC) DO NOTHING
        RETURNING *`
    ).get({ mic })
}

exports.delStock = (mic) => {
    return db.prepare(`
        DELETE FROM investment
        WHERE stockMIC == @mic
        RETURNING *`
    ).get({ mic })
}

exports.updateStock = db.transaction((mic, price) => {
    const b4 = db.prepare(`
        SELECT * FROM investment
        WHERE stockMIC == @mic`
    ).get({ mic })

    const now = db.prepare(`
        UPDATE investment SET
            stockPrice = @price,
            value = value * @price / stockPrice
        WHERE stockMIC == @mic
        RETURNING *`
    ).get({ mic, price })

    const inRangeX = (v, min, max) => {
        return min < v && v < max
    }

    const inRangeB4 = inRangeX(b4.value, b4.minValue, b4.maxValue)
    const inRangeNow = inRangeX(now.value, now.minValue, now.maxValue)
    return (inRangeB4 == inRangeNow) ? undefined : now
})

exports.invest = (mic, value, diff) => {
    return db.prepare(`
        UPDATE investment SET
            initialValue = @value,
            value = @value,
            minValue = @value - @diff,
            maxValue = @value + @diff
        WHERE stockMIC == @mic AND stockPrice IS NOT NULL
        RETURNING *`
    ).get({ mic, value, diff })
}
