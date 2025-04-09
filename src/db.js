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
    const query = 'INSERT INTO investment (stockMIC) VALUES (@mic) RETURNING *'
    return db.prepare(query).get({ mic })
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

    return db.prepare(query).get({ mic, value, diff })
}

/*
queries.ADD_OR_UPDATE_STOCK = `
    INSERT INTO stock (MIC, price, time, marketHours)
    VALUES ($mic, $price, $time, $marketHours)
    ON CONFLICT (MIC) DO UPDATE SET
        price = $price,
        time = $time,
        marketHours = $marketHours`
*/

// queries.LIST = `
// SELECT * FROM investment WHERE stockMIC IN ${MICs}
// ORDER BY value - firstValue DESC LIMIT $limit`

/*

queries.GET_ALL_STOCKS = `SELECT * FROM stock`
queries.GET_STOCKS = `SELECT * FROM stock ORDER BY price DESC LIMIT $limit`
queries.GET_SPECIFIC_STOCKS = `SELECT * FROM stock WHERE MIC IN ${MICs} ORDER BY price DESC LIMIT $limit`

// get investments from which a notification must be generated
// should notify when min gain or max loss were reached (out of range)
queries.GET_NOTIFY_STOCK_INVESTMENTS = `
    UPDATE investment SET valueInRange = (value - firstValue ) BETWEEN minValue AND maxValue
    WHERE ((value - firstValue) BETWEEN minValue AND maxValue) != valueInRange AND MIC = $mic
    RETURNING *`

// order by greatest absolute gain
queries.GET_USER_INVESTMENTS = `
    SELECT * FROM investment WHERE user = $user
    ORDER BY value - firstValue DESC LIMIT $limit`

queries.GET_SPECIFIC_USER_INVESTMENTS = `
    SELECT * FROM investment WHERE MIC IN ${MICs} AND user = $user
    ORDER BY value - firstValue DESC LIMIT $limit`

queries.DEL_ALL_USER_INVESTMENTS = `DELETE FROM investment WHERE user = $user RETURNING *`
queries.DEL_SPECIFIC_USER_INVESTMENTS = `DELETE FROM investment WHERE user = $user AND MIC IN ${MICs} RETURNING *`

queries.ADD_OR_UPDATE_STOCK = `
    INSERT INTO stock (MIC, price, time, marketHours)
    VALUES ($mic, $price, $time, $marketHours)
    ON CONFLICT (MIC) DO UPDATE SET
        price = $price,
        time = $time,
        marketHours = $marketHours`

queries.ADD_OR_UPDATE_INVESTMENT = `
    INSERT OR REPLACE INTO investment (MIC, user, firstValue , value, minValue, maxValue, valueInRange)
    VALUES ($mic, $user, $value, $value, $minValue, $maxValue, TRUE)`
*/
