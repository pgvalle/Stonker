const { Database, OPEN_READWRITE, OPEN_CREATE } = require('sqlite3')

const db = new Database('./stocks.db', OPEN_READWRITE | OPEN_CREATE)
const queries = {}

queries.CREATE_TABLES = `
    CREATE TABLE IF NOT EXISTS stock (
        MIC         VARCHAR(8)  NOT NULL,
        price       REAL        NOT NULL,
        time        INTEGER     NOT NULL,
        marketHours VARCHAR(20) NOT NULL,
        PRIMARY KEY (MIC)
    );
    
    CREATE TABLE IF NOT EXISTS investment (
        stockMIC      VARCHAR(8) NOT NULL,
        user          INTEGER    NOT NULL,
        refStockPrice REAL       NOT NULL,
        value         REAL       NOT NULL,
        centerValue   REAL       NOT NULL,
        rangeValue    REAL       NOT NULL,
        PRIMARY KEY (stockMIC, user)
    );`

queries.GET_STOCKS = `SELECT * FROM stock`

queries.ADD_OR_UPDATE_STOCK = `
    INSERT OR REPLACE INTO stock (MIC, price, time, marketHours)
    VALUES ($MIC, $price, $time, $marketHours)`

queries.GET_USER_INVESTMENTS = `
    SELECT investment.*, stock.price
    FROM investment INNER JOIN stock ON investment.stockMIC = stock.MIC
    WHERE investment.user = $user`

queries.ADD_OR_UDPATE_USER_INVESTMENT = `
    INSERT OR REPLACE INTO investment (stockMIC, user, refStockPrice, value, centerValue, rangeValue)
    SELECT stock.MIC, $user, stock.price, $value, $value, $rangeValue
    FROM stock WHERE stock.MIC = $stockMIC
    RETURNING rowid`

/*
queries.UPDATE_INVESTMENTS_ON_STOCK = `
    UPDATE investment SET
        centerValue = centerValue + CEIL(ABS(
            ($stockPrice / refStockPrice) * value - centerValue
        ) / CEIL((2 * rangeValue) / someFactor))
        * SIGN(
            ($stockPrice / refStockPrice) * value - centerValue
        ) * CEIL((2 * rangeValue) / someFactor)
    WHERE stockMIC = $stockMIC AND ABS(($stockPrice / refStockPrice) * value - centerValue) > rangeValue
    RETURNING *`
*/

queries.DEL_USER_INVESTMENTS = `DELETE FROM investment WHERE user = $user RETURNING rowid`
queries.DEL_USER_INVESTMENTS_SPECIFIED = `DELETE FROM investment WHERE user = $user AND stockMIC IN ($MICs) RETURNING rowid`

module.exports = {
    db, queries
}