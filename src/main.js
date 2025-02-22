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
const PLAIN_MSG_REGEX = /^(?!\/\S).+/s

// Make the bot respond to commands
bot.onText(CMD_REGEX, async (msg, match) => {
    const user = msg.chat.id
    const name = match.groups.name.toLocaleLowerCase()
    const args = match.groups.args?.split(' ') || []
    const command = commands[name]
    
    if (command) {
        await command(user, args)
    } else {
        await sendMessage(user, `What the heck is ${name}? Send a /help bro.`)
    }
})

// make the bot respond to normal messages
bot.onText(PLAIN_MSG_REGEX, async (msg, _) => {
    const user = msg.chat.id
    await sendMessage(user, `Send a /help to get useful info.`)
})