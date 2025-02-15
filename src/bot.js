const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api

const TELEGRAM_TK = '8075711316:AAGaVXIGrthKWKsmnbtEAa4ocdLnw-qYLRY'
const bot = new TelegramBot(TELEGRAM_TK, { polling: true });

const db = require('./db')
const msgs = require('./msgs')

// const yf = require('yahoo-finance2').default; // https://github.com/gadicc/node-yahoo-finance2

var commands = {
  add: function(chatId, args) {
    // var argList = args?.split(' ')
    // if (!argList || argList.length < 3) {
    //   bot.sendMessage(chatId, msgs.WRONG_SYNTAX)
    //   return
    // }

    // const ticker = argList[0]
    // const name = argList[1]
    // yf.quote(ticker).then(function(quote) {
    //   //console.log(quote)
    //   db.exec(`INSERT INTO watcher (name, ticker, chat_id, ref_price, t2n, cur_t2n)
    //     VALUES ('${name}', '${ticker}', ${chatId}, ${quote.regularMarketPrice}, NULL, NULL)`,
    //     function(err) {
    //       console.log('errors: ', err)
    //     }
    //   )
    // })
  },

  del: function(chatId, args) {
    if (!args || args.length < 1) {
      bot.sendMessage(chatId, msgs.WRONG_SYNTAX)
      return
    }

    for (const arg of argList) {
      
    }
  },

  edit: function(chatId, args) {

  },

  list: function(chatId, args) {

  },

  exit: function(chatId, args) {
    if (args) {
      bot.sendMessage(chatId, msgs.WRONG_SYNTAX)
      return
    }
  
    db.delUser(chatId, function(err) {
      console.log(`user ${chatId} deleted`)
      bot.sendMessage(chatId, msgs.BYE_BYE)
    })
  }
}

bot.on('message', function(msg) {
  const chatId = msg.chat.id
  const text = msg.text

  const cmdInfo = text.match(
    /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
  )?.groups
  const isCmd = (cmdInfo != undefined)

  db.getUser(chatId, function(err, validUser) {
    if (!validUser && !isCmd) {
      db.addUser(chatId, function(err) {
        console.log(`new user ${chatId} saved`)
        bot.sendMessage(chatId, msgs.DATA_SAVING_NOTICE);
        bot.sendMessage(chatId, msgs.HELP)
      })
      return
    }

    if (!validUser && isCmd) {
      bot.sendMessage(chatId, msgs.INVALID_USER)
      return;
    }

    if (validUser && isCmd) {
      const command = commands[cmdInfo.name]
      if (command) {
        const argList = cmdInfo.args?.split(' ')
        command(chatId, argList)
      } else {
        bot.sendMessage(chatId, msgs.INVALID_COMMAND)
      }
      return
    }

    bot.sendMessage(chatId, `amagaubigi`)
  })
});

