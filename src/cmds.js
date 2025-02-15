const { db, bot, msgs } = require('./globals')
const { chatQueryCallback } = require('./utils')

var COMMANDS = {
  watch: function(chatId, args) {

  },

  unwatch: function(chatId, args) {

  },

  forget: function(chatId, args) {
    if (args) {
      bot.sendMessage(chatId, msgs.WRONG_SYNTAX)
      return
    }
  
    db.exec(`DELETE FROM chat WHERE id = ${chatId}`, function(err) {
      console.log(`user ${chatId} deleted`)
      bot.sendMessage(chatId, msgs.BYE_BYE)
    })
  }
}

function checkAndExecCmd(chatId, msgText) {
  var cmdInfo = msgText.match(
    /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
  )?.groups

  if (!cmdInfo) {
    return false
  }

  chatQueryCallback(chatId, function(err, row) {
    // starting bot with a command. Weird but may happen
    if (!row) {
      console.log('unsaved chat user')
      bot.sendMessage(chatId, msgs.FORGETFUL)
      return;
    }

    const command = COMMANDS[cmdInfo.name]
    if (command) {
      command(chatId, cmdInfo.args)
      return
    }

    bot.sendMessage(chatId, msgs.INVALID_COMMAND)
  })

  return 1;
}

module.exports = {
  checkAndExecCmd
}