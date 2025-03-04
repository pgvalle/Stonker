const { db, queries } = require('./db')
const bot = require('./bot')
const cmds = require('./cmds')
const stocks = require('./stocks')

db.serialize(() => {   
    db.exec(queries.DB_SETUP)
    stocks.refreshStockListeners()
})

bot.respondToCmds(cmds)
bot.respondToMsgs()
