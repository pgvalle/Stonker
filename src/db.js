const sql = require('sqlite3')

const db = new sql.Database('./stocks.db', sql.OPEN_CREATE | sql.OPEN_READWRITE)

// utility to make queries easier
function dbQuery(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => {
            if (error) reject(error);
            else resolve(rows);
        })
    })
}

exports.init = async function () {
    await dbQuery(`
    CREATE TABLE IF NOT EXISTS investment (
        stockMIC     VARCHAR(8) NOT NULL,
        stockPrice   REAL,

        firstValue   REAL,
        value        REAL,
        minValue     REAL,
        maxValue     REAL,
        valueInRange INTEGER,
        PRIMARY KEY (stockMIC)
    );

    CREATE TRIGGER IF NOT EXISTS updateInvestmentValue
    AFTER UPDATE ON investment.stockPrice
    FOR EACH ROW BEGIN
        UPDATE investment SET value = OLD.value * NEW.stockPrice / OLD.stockPrice
        WHERE OLD.value IS NOT NULL AND OLD.stockPrice IS NOT NULL;
    END;`)
}

exports.addStock = async function (mic) {
    const sql = 'INSERT INTO investment (stockMIC) VALUES ($mic)'
    return await dbQuery(sql, { $mic: mic })
}

exports.delStock = async function (mic) {
    const sql = 'DELETE FROM investment WHERE stockMIC = $mic RETURNING *'
    return await dbQuery(sql, { $mic: mic })
}

exports.getStocks = async function () {
    return await dbQuery('SELECT * FROM investment ORDER BY stockPrice DESC')
}

exports.updateStock = async function (data) {
    const sql1 = 'UPDATE investment SET stockPrice = $price WHERE stockMIC = $mic'
    await dbQuery(sql1, { $mic: data.id, $price: data.price })

    const cond = '((value - firstValue) BETWEEN minValue AND maxValue)'
    const sql2 = `
    UPDATE investment SET valueInRange = ${cond}
    WHERE ${cond} != valueInRange AND stockMIC = $mic
    RETURNING *`

    return await dbQuery(sql2, { $mic: data.id })
}

exports.invest = async function (mic, value, diff) {
    const sql = `
    UPDATE investment SET
        firstValue = $value,
        value = $value,
        minValue = $minValue,
        maxValue = $maxValue,
        valueInRange = TRUE
    WHERE stockMIC = $mic AND stockPrice IS NOT NULL
    RETURNING *`

    return await dbQuery(sql, {
        $mic: mic,
        $value: value,
        $minValue: value - diff,
        $maxValue: value + diff
    })
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
