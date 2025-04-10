const Database = require('better-sqlite3')
const db = new Database('./investments.db')

// DB SETUP

db.prepare(`
    CREATE TABLE IF NOT EXISTS investment (
        stockMIC     VARCHAR(8) NOT NULL,
        stockPrice   REAL,
        initialValue REAL,
        value        REAL,
        minValue     REAL,
        maxValue     REAL,
        shouldNotify INTEGER,
        PRIMARY KEY (stockMIC)
    )`
).run()

// EXPORTS

exports.addStock = function (mic) {
    try {
        db.prepare(`
            INSERT OR IGNORE INTO investment (stockMIC)
            VALUES (@mic)`
        ).run({ mic })
        return true
    } catch (error) {
        return false
    }
}

exports.delStock = function (mic) {
    return db.prepare(`
        DELETE FROM investment
        WHERE stockMIC == @mic
        RETURNING *`
    ).get({ mic })
}

exports.getStocks = function () {
    return db.prepare(
        'SELECT * FROM investment'
    ).all()
}

exports.updateStock = db.transaction((mic, price) => {
    db.prepare(`
        UPDATE investment SET
            stockPrice = @price,
            value = value * @price / stockPrice,
            shouldNotify = (value BETWEEN minValue AND maxValue) !=
                ((value * @price / stockPrice) BETWEEN minValue AND maxValue)
        WHERE stockMIC == @mic`
    ).run({ mic, price })

    return db.prepare(`
        UPDATE investment SET shouldNotify = FALSE
        WHERE shouldNotify == TRUE
        RETURNING *`
    ).get()
})

exports.invest = function (mic, value, diff) {
    return db.prepare(`
        UPDATE investment SET
            initialValue = @value,
            value = @value,
            minValue = @value - @diff,
            maxValue = @value + @diff,
            shouldNotify = FALSE
        WHERE stockMIC == @mic AND stockPrice IS NOT NULL
        RETURNING *`
    ).get({ mic, value, diff })
}
