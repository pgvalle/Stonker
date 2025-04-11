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

// useful function
function getStock(mic) {
    const row = db.prepare(`
        SELECT * FROM investment
        WHERE stockMIC == @mic`
    ).get({ mic })

    return row 
}

// EXPORTS

exports.getStocks = () => {
    return db.prepare(
        'SELECT * FROM investment'
    ).all()
}

exports.addStock = db.transaction((mic) => {
    if (getStock(mic)) return false

    db.prepare(
        'INSERT INTO investment (stockMIC) VALUES (@mic)'
    ).run({ mic })

    return true
})

exports.delStock = (mic) => {
    return db.prepare(`
        DELETE FROM investment
        WHERE stockMIC == @mic
        RETURNING *`
    ).get({ mic })
}

exports.updateStock = db.transaction((mic, price) => {
    const b4 = getStock(mic)
    if (!b4 || !b4.value) return undefined

    const now = db.prepare(`
        UPDATE investment SET
            stockPrice = @price,
            value = value * @price / stockPrice
        WHERE stockMIC == @mic
        RETURNING *`
    ).get({ mic, price })

    const inRange = (v, min, max) => {
        return v >= min && v <= max
    }
   
    const inRangeB4 = inRange(b4.value, b4.minValue, b4.maxValue)
    const inRangeNow = inRange(now.value, now.minValue, now.maxValue)
    if (inRangeB4 == inRangeNow) return undefined
    return now
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
