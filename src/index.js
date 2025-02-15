const globals = require('./globals')
const db = globals.db
const bot = globals.bot
const msgs = globals.msgs

// configure db

db.exec(`
  CREATE TABLE IF NOT EXISTS chat (
    id INTEGER NOT NULL PRIMARY KEY
  )`
)

db.exec(`
  CREATE TABLE IF NOT EXISTS watcher (
    ticker    VARCHAR(8)  NOT NULL PRIMARY KEY,
    chat_id   INTEGER     NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
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

// hook to save users
bot.on('message', (msg) => {
  const chatId = msg.chat.id
  // if id isn't saved, save it and tell to the user
  db.get(`SELECT * FROM chat WHERE id = ${chatId}`, function(error, row) {
    // chat not saved, so save it and notify user
    if (row == undefined) {
      db.exec(`INSERT INTO chat (id) VALUES (${chatId})`)
      bot.sendMessage(chatId, msgs.DATA_SAVING_NOTICE);
      bot.sendMessage(chatId, msgs.HELP)
    }
  })
});

// detect commands
const cmds = require('./cmds')

bot.onText(cmds.REGEX, (msg, match) => {
  try {
    const name = match[1]
    const args = match[2]
    const command = cmds.COMMANDS[name]
    command(args)
  } catch (error) {
    bot.sendMessage(chatId, msgs.INVALID_COMMAND)
  }
})

const yf = require('yahoo-finance2').default; // https://github.com/gadicc/node-yahoo-finance2

const aaaa = async () => {
  const result = await yf.quote('AAAA')

  console.log(result)
}

aaaa()