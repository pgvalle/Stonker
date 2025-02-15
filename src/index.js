const { db, bot, msgs } = require('./globals')
const { chatQueryCallback } = require('./utils')
const { checkAndExecCmd } = require('./cmds')

// configure db

db.exec(`
  CREATE TABLE IF NOT EXISTS chat (
    id INTEGER NOT NULL PRIMARY KEY
  )`
)

db.exec(`
  CREATE TABLE IF NOT EXISTS watcher (
    name      VARCHAR(8) NOT NULL PRIMARY KEY,
    ticker    VARCHAR(8) NOT NULL,
    chat_id   INTEGER    NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
    ref_price REAL,
    t2n       INTEGER, -- time to notify
    cur_t2n   INTEGER  -- current time to notify
    
    -- either notify by price or by timestamp, or both
    CHECK (
      ref_price IS NOT NULL OR (t2n IS NOT NULL AND cur_t2n IS NOT NULL)
    )
  )`
)

// configure bot

bot.on('message', function(msg) {
  const chatId = msg.chat.id
  const msgText = msg.text
  console.log(`${chatId}: ${msgText}`)

  if (checkAndExecCmd(chatId, msgText)) {
    return
  }

  chatQueryCallback(chatId, function(err, row) {
    // chat already saved. don't do anything
    if (row) {
      return
    }

    db.exec(`INSERT INTO chat (id) VALUES (${chatId})`, function(err) {
      console.log(`new user ${chatId} saved`)
      bot.sendMessage(chatId, msgs.DATA_SAVING_NOTICE);
      bot.sendMessage(chatId, msgs.HELP)
    })
  })
});
