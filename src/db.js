const { Database, OPEN_READWRITE, OPEN_CREATE } = require('sqlite3')
const db = new Database('./database.db', OPEN_READWRITE | OPEN_CREATE);

// creating tables

db.exec(`
    CREATE TABLE IF NOT EXISTS user (
        chat INTEGER NOT NULL PRIMARY KEY
    )`
)

db.exec(`
    CREATE TABLE IF NOT EXISTS watcher (
        ticker     VARCHAR(8) NOT NULL,
        chat       INTEGER    NOT NULL REFERENCES user(chat) ON DELETE CASCADE,
        ref_price  REAL       NOT NULL,
        change     REAL       NOT NULL,
        ref_change REAL       NOT NULL,
        PRIMARY KEY (ticker, chat)
    )`
)

module.exports = {
    db
}