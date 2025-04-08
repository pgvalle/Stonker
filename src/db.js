const { Database, OPEN_READWRITE, OPEN_CREATE } = require('sqlite3')

const db = new Database('./stocks.db', OPEN_READWRITE | OPEN_CREATE)
const queries = {}

// must use db.exec for this one
queries.DB_SETUP = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS investment (
        stockMIC     VARCHAR(8) NOT NULL,
        stockPrice   REAL       NOT NULL,
        firstValue   REAL,
        value        REAL,
        minValue     REAL,
        maxValue     REAL,
        valueInRange INTEGER,
        PRIMARY KEY (MIC)
    );
    
    CREATE TRIGGER IF NOT EXISTS updateInvestmentValue
    AFTER UPDATE ON investment.stockPrice
    FOR EACH ROW BEGIN
        UPDATE investment SET
            value = value * NEW.price / OLD.price
        WHERE investment.MIC = NEW.MIC;
    END;`
