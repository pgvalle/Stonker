const { Database, OPEN_READWRITE, OPEN_CREATE } = require('sqlite3')

const db = new Database('./stocks.db', OPEN_READWRITE | OPEN_CREATE)
const queries = {}

queries.CREATE_TABLES = `
    CREATE TABLE IF NOT EXISTS stock (
        MIC         VARCHAR(8)  NOT NULL PRIMARY KEY,
        price       REAL        NOT NULL,
        time        INTEGER     NOT NULL,
        marketHours VARCHAR(20) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS investment (
        MIC           VARCHAR(8) NOT NULL,
        user          INTEGER    NOT NULL,
        refStockPrice REAL       NOT NULL,
        value         REAL       NOT NULL,
        lowValue      REAL       NOT NULL,
        highValue     REAL       NOT NULL,
        PRIMARY KEY (MIC, user)
    );`

queries.GET_STOCKS = `SELECT * FROM stock`

queries.GET_STOCKS_SPECIFIED = `SELECT * FROM stock WHERE MIC IN (?)`

queries.ADD_STOCK = `INSERT OR REPLACE INTO stock (MIC, price, time, marketHours)
                     VALUES ('$MIC', $price, $time, '$marketHours')`

queries.GET_USER_INVESTMENTS = `SELECT investment.*, stock.price FROM investment INNER JOIN stock
                                ON investment.MIC = stock.MIC WHERE investment.user = ?`

queries.GET_USER_INVESTMENTS_SPECIFIED = `SELECT investment.*, stock.price
                                          FROM investment INNER JOIN stock
                                          ON investment.MIC = stock.MIC
                                          WHERE investment.user = ? AND stock.MIC IN (?)`

queries.ADD_USER_INVESTMENT = `INSERT OR REPLACE INTO investment (MIC, user, refStockPrice, value, lowValue, highValue)
                               SELECT stock.MIC, $user, stock.price, $value, $lowValue, $highValue
                               FROM stock WHERE stock.MIC = $MIC RETURNING rowid`

queries.DEL_USER_INVESTMENTS = `DELETE FROM investment WHERE user = ? RETURNING rowid`

queries.DEL_USER_INVESTMENTS_SPECIFIED = `DELETE FROM investment
                                          WHERE user = ? AND MIC IN (?) RETURNING rowid`

module.exports = {
    db, queries
}