const globals = require('./globals')
const db = globals.db
const bot = globals.bot
const msgs = globals.msgs

function watch(chat, args) {

}

function unwatch(chat, args) {

}

function forget(chat, args) {
  const chatId = chat.id
  if (args) {
    bot.sendMessage(chatId, msgs.WRONG_SYNTAX)
    return
  }

  db.get(`SELECT * FROM chat WHERE id = ${chatId}`, function(err, row) {
    if (row) {
      db.exec(`DELETE FROM chat WHERE id == ${chatId}`, function(err) {
        console.log(`user ${chatId} deleted`)
      })
      bot.sendMessage(chatId, msgs.BYE_BYE)
    }
  })

  
}

module.exports = {
  REGEX: /^\/(\S+)(?:\s+(.+))?$/,
  COMMANDS: {
    watch, unwatch, forget
  },
}