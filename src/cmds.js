const { db, bot, msgs } = require('./globals')
const { chatQueryCallback } = require('./utils')

function watch(chatId, args) {
  
}

function unwatch(chatId, args) {

}

function forget(chatId, args) {
  if (args) {
    bot.sendMessage(chatId, msgs.WRONG_SYNTAX)
    return
  }

  chatQueryCallback(chatId, function(err, row) {
    // starting bot with /forget command. Weird but may happen
    if (!row) {
      console.log('unsaved user trying to forget themselves')
      bot.sendMessage(chatId, )
      return;
    }
    
    db.exec(`DELETE FROM chat WHERE id = ${chatId}`, function(err) {
      console.log(`user ${chatId} deleted`)
      bot.sendMessage(chatId, msgs.BYE_BYE)
    })
  })
}

var COMMANDS = {
  watch, unwatch, forget
}

function validateAndExec(chatId, msgText) {
  var cmdInfo = msgText.match(/^\/(\S+)(?:\s+(.+))?$/)
  if (!cmdInfo) {
    return false
  }

  const cmdName = cmdInfo[1]
  const cmdArgs = cmdInfo[2]
  const cmd = COMMANDS[cmdName]
  if (cmd) {
    cmd(chatId, cmdArgs)
  }
  return cmd != undefined;
}

module.exports = {
  validateAndExec
}