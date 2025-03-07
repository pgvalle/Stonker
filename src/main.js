const { db, queries } = require('./db')
const bot = require('./bot')
const cmds = require('./cmds')
const stocks = require('./stocks')

bot.setResponses(cmds)

db.serialize(() => {   
    db.exec(queries.DB_SETUP)
    stocks.refreshStockListeners()
})
