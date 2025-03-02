const { Database, OPEN_READWRITE, OPEN_CREATE } = require('sqlite3')

const db = new Database('./stocks.db', OPEN_READWRITE | OPEN_CREATE)
const queries = {}

// must use db.exec for this one
queries.DB_SETUP = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS stock (
        MIC         VARCHAR(8)  NOT NULL,
        price       REAL        NOT NULL,
        time        INTEGER     NOT NULL,
        marketHours VARCHAR(20) NOT NULL,
        PRIMARY KEY (MIC)
    );

    CREATE TABLE IF NOT EXISTS investment (
        MIC          VARCHAR(8) NOT NULL,
        user         INTEGER    NOT NULL,
        firstValue   REAL       NOT NULL,
        value        REAL       NOT NULL,
        minValue     REAL       NOT NULL,
        maxValue     REAL       NOT NULL,
        valueInRange INTEGER    NOT NULL,
        PRIMARY KEY (MIC, user),
        FOREIGN KEY (MIC) REFERENCES stock (MIC)
    );
    
    CREATE TRIGGER IF NOT EXISTS updateInvestmentValue
    AFTER UPDATE ON stock
    FOR EACH ROW BEGIN
        UPDATE investment SET
            value = value * NEW.price / OLD.price
        WHERE investment.MIC = NEW.MIC;
    END;`

const MICs = `(SELECT upper(value) FROM json_each($MICs))`

// TODO: here
queries.GET_ALL_STOCKS = `SELECT * FROM stock`
queries.GET_STOCKS = `SELECT * FROM stock ORDER BY price DESC LIMIT $limit`
queries.GET_SPECIFIC_STOCKS = `SELECT * FROM stock WHERE MIC IN ${MICs} ORDER BY price DESC LIMIT $limit`

// get investments from which a notification must be generated
// should notify when min gain or max loss were reached (out of range)
queries.GET_NOTIFY_STOCK_INVESTMENTS = `
    UPDATE investment SET valueInRange = (value - firstValue ) BETWEEN minValue AND maxValue
    WHERE ((value - firstValue) BETWEEN minValue AND maxValue) != valueInRange AND MIC = $MIC
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
    VALUES (upper($MIC), $price, $time, $marketHours)
    ON CONFLICT (MIC) DO UPDATE SET
        price = $price,
        time = $time,
        marketHours = $marketHours`

queries.ADD_OR_UPDATE_INVESTMENT = `
    INSERT OR REPLACE INTO investment (MIC, user, firstValue , value, minValue, maxValue, valueInRange)
    VALUES (upper($MIC), $user, $value, $value, $minValue, $maxValue, TRUE)`

module.exports = {
    db, queries
}