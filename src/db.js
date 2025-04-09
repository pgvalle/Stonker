const Database = require('better-sqlite3')

const db = new Database('./stocks.db')

// DB SETUP

db.prepare(`
    CREATE TABLE IF NOT EXISTS investment (
        stockMIC     VARCHAR(8) NOT NULL,
        stockPrice   REAL,

        firstValue   REAL,
        value        REAL,
        minValue     REAL,
        maxValue     REAL,
        valueInRange INTEGER,
        PRIMARY KEY (stockMIC)
    )`
).run()

db.prepare(`
    CREATE TRIGGER IF NOT EXISTS updateInvestmentValue
    AFTER UPDATE ON investment
    FOR EACH ROW BEGIN
        UPDATE investment SET value = OLD.value * NEW.stockPrice / OLD.stockPrice
        WHERE OLD.value IS NOT NULL AND OLD.stockPrice IS NOT NULL;
    END`
).run()

// EXPORTS

exports.addStock = function (mic) {
    const query = 'INSERT INTO investment (stockMIC) VALUES (@mic)'
    try {
        db.prepare(query).run({ mic })
        return true
    } catch (error) {
        return false
    }
}

exports.delStock = function (mic) {
    const query = 'DELETE FROM investment WHERE stockMIC = @mic RETURNING *'
    return db.prepare(query).get({ mic })
}

exports.getStocks = function () {
    return db.prepare('SELECT * FROM investment').all()
}

exports.updateStock = function (mic, price) {
    const query1 = 'UPDATE investment SET stockPrice = @price WHERE stockMIC = @mic'
    db.prepare(query1).run({ mic, price })

    const cond = '(value - firstValue) BETWEEN minValue AND maxValue'
    const query2 = `
    UPDATE investment SET valueInRange = ${cond}
    WHERE ${cond} != valueInRange AND stockMIC = $mic
    RETURNING *`
        
    return db.prepare(query2).get({ mic })
}

exports.invest = function (mic, value, diff) {
    const query = `
    UPDATE investment SET
        firstValue = @value,
        value = @value,
        minValue = @value - @diff,
        maxValue = @value + @diff,
        valueInRange = TRUE
    WHERE stockMIC = @mic AND stockPrice IS NOT NULL
    RETURNING *`

    db.prepare(query).get({ mic, value, diff })
}
