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
    ticker     VARCHAR(8) NOT NULL PRIMARY KEY,
    ref_price  REAL       NOT NULL,
    ref_change REAL       NOT NULL,
    chat_id    INTEGER    NOT NULL REFERENCES chat(id) ON DELETE CASCADE
  )`
)

// all queries located here to facilitate refactoring

module.exports = {
  db,

  getUser: function(chatId, callback) {
    db.get(`SELECT * FROM user WHERE chat_id == ${chatId}`, callback)
  },
  
  addUser: function(chatId, callback) {
    db.exec(`INSERT INTO user (chat_id) VALUES (${chatId})`, callback)
  },
  
  delUser: function(chatId, callback) {
    db.exec(`DELETE FROM user WHERE chat_id = ${chatId}`, callback)
  }
}