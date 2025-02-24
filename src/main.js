const core = require('./core')
const commands = require('./cmds')

// Create tables
core.dbExecOrError(`
    CREATE TABLE IF NOT EXISTS stock (
        MIC         VARCHAR(8)  NOT NULL PRIMARY KEY,
        price       REAL        NOT NULL,
        time        TIMESTAMP   NOT NULL,
        marketHours VARCHAR(20) NOT NULL
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
core.refreshStockListeners()
// refresh listeners every 30 seconds
setInterval(core.refreshStockListeners, 30000)

const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
const PLAIN_MSG_REGEX = /^(?!\/\S).+/s

// Make the bot respond to commands
core.bot.onText(CMD_REGEX, async (msg, match) => {
    const user = msg.chat.id
    const name = match.groups.name.toLocaleLowerCase()
    const args = match.groups.args?.split(' ') || []
    const command = commands[name]
    
    if (command) {
        await command(user, args)
    } else {
        await core.sendMsg(user, `What the heck is ${name}? Send a /help bro.`)
    }
})

// make the bot respond to normal messages
core.bot.onText(PLAIN_MSG_REGEX, async (msg, _) => {
    const user = msg.chat.id
    await core.sendMsg(user, `Send a /help to get useful info.`)
})