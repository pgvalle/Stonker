const { db, queries } = require('./db')
const bot = require('./bot')
const cmds = require('./cmds')
const stocks = require('./stocks')

db.serialize(() => {   
    db.exec(queries.CREATE_TABLES)
    db.exec(queries.CREATE_TRIGGERS)

    stocks.refreshStockListeners()
})

bot.respondToCmds(cmds)
bot.respondToPlainMsgs()
