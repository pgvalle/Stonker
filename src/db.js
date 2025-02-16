const { Database, OPEN_READWRITE, OPEN_CREATE } = require('sqlite3')
const db = new Database('./chats.db', OPEN_READWRITE | OPEN_CREATE);

// creating tables

db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    chat_id INTEGER NOT NULL PRIMARY KEY
  )`
)

db.exec(`
  CREATE TABLE IF NOT EXISTS watcher (
    ticker     VARCHAR(8) NOT NULL,
    chat_id    INTEGER    NOT NULL REFERENCES chat(id) ON DELETE CASCADE
    ref_price  REAL       NOT NULL,
    change     REAL       NOT NULL,
    ref_change REAL       NOT NULL,
    PRIMARY KEY (ticker, chat_id)
  )`
)

// all queries located here to facilitate refactoring

module.exports = {
  db
}