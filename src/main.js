const { db, bot, sendMessage, refreshStockListeners } = require('./core')
const commands = require('./cmds')

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS stock (
        MIC   VARCHAR(8) NOT NULL PRIMARY KEY,
        price REAL       NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS investment (
        stockMIC      VARCHAR(8) NOT NULL,
        user          INTEGER    NOT NULL,
        refStockPrice REAL       NOT NULL,
        value         REAL       NOT NULL,
        lowValue      REAL       NOT NULL,
        highValue     REAL       NOT NULL,
        PRIMARY KEY (stockMIC, user)
    );`
)

// add listeners on startup
refreshStockListeners()
// refresh listeners every 30 seconds
setInterval(refreshStockListeners, 30000)

const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/

// Make the bot reply to commands
bot.onText(CMD_REGEX, async (msg, match) => {
    const user = msg.chat.id
    const { name, args } = match.groups

    const command = commands[name]
    if (command) {
        const argList = args?.split(' ')
        command(user, argList)
    } else {
        sendMessage(user, `What the heck is ${name}?`)
    }
})