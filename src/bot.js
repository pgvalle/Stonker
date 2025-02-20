const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const { addTicker } = require('stocksocket') // https://github.com/gregtuc/StockSocket
const { Database, OPEN_READWRITE, OPEN_CREATE } = require('sqlite3')

const TELEGRAM_BOT_TK = '8075711316:AAGaVXIGrthKWKsmnbtEAa4ocdLnw-qYLRY'
const bot = new TelegramBot(TELEGRAM_BOT_TK, { polling: true })
const db = new Database('./database.db', OPEN_READWRITE | OPEN_CREATE);

// creating tables

db.exec(`
        CREATE TABLE IF NOT EXISTS watcher (
                stockId     VARCHAR(8) NOT NULL,
                chat        INTEGER    NOT NULL,
                refPrice    REAL       NOT NULL,
                pctLow      REAL       NOT NULL,
                pctHigh     REAL       NOT NULL,
                PRIMARY KEY (stockId, chat)
        )`
)

db.exec(`
        CREATE TABLE IF NOT EXISTS stock (
                stockId     VARCHAR(8) NOT NULL PRIMARY KEY,
                price       REAL       NOT NULL
        )`
)

// tell users what stocks changed according to watch parameters and current price

function notifyUsers(watchers, newStockPrice) {
        for (const { stockId, chat, refPrice } of watchers) {
                const pct = 100*(newStockPrice/refPrice-1)
                var msg = `${stockId} stock changed ${pct}%\n`
                msg    += `ref=${refPrice} latest=${newStockPrice}`

                bot.sendMessage(chat, msg)
        }
}

// update respective stock watchers

function updateStockWatchers(stockId, newStockPrice) {
        const action = `
                UPDATE watcher SET
                        pctLow = CASE
                                WHEN ${newStockPrice}/refPrice > pctHigh THEN pctHigh
                                WHEN ${newStockPrice}/refPrice < pctLow  THEN 2*pctLow-pctHigh
                        END,
                        pctHigh = CASE
                                WHEN ${newStockPrice}/refPrice > pctHigh THEN 2*pctHigh-pctLow
                                WHEN ${newStockPrice}/refPrice < pctLow  THEN pctLow
                        END
                WHERE stockId = '${stockId}' AND ${newStockPrice}/refPrice NOT BETWEEN pctLow AND pctHigh
                RETURNING *`
        
        db.all(action, (err, watchers) => {
                if (err) {
                        console.log(`stock watchers update failed. ${err.message}`)
                } else {
                        notifyUsers(watchers, newStockPrice)
                }
        })
}

// update respective stock price. Callback given to new stock

function updateStock(info) {
        const stockId = info.id
        const newStockPrice = info.price
        const action = `INSERT OR REPLACE INTO stock (stockId, price)
                        VALUES ('${stockId}', ${newStockPrice})`

        db.exec(action, (err) => {
                if (err) {
                        console.log(`${stockId} update failed. ${err.message}`)
                } else {
                        updateStockWatchers(stockId, newStockPrice)
                }
        })
}

// setup stock monitoring for stocks already saved in database

db.all(`SELECT stockId FROM stock`, (err, rows) => {
        if (err) {
                console.log(`db stocks configuring failed. ${err.message}`)
        } else {
                for (const { stockId } of rows) {
                        addTicker(stockId, updateStock)
                }
        }
})

// bot commands

function watch(chat, args) {
        if (args?.length !== 2) {
                bot.sendMessage(chat, 'Wrong command syntax.')
                return
        }

        const changeRange = args[1]

        if (isNaN(Number(changeRange))) {
                bot.sendMessage(chat, `${changeRange} is not a number bro.`)
                return
        }
        
        const stockId = args[0].toUpperCase()
        const action = `SELECT * FROM stock WHERE stockId = '${stockId}'`

        db.get(action, (err, row) => {
                if (err) {
                        bot.sendMessage(chat, `Failed to add ${stockId} watcher. SQLite error.`)
                        return
                }

                if (!row ||) {
                        bot.sendMessage(chat, `${stockId} not found. Try again later.`)
                        addTicker(stockId, updateStock)
                        return
                }

                const action = `
                        INSERT OR REPLACE INTO watcher (stockId, chat, refPrice, pctLow, pctHigh)
                        VALUES ('${stockId}', ${chat}, ${row.price}, ${1-changeRange}, ${1+changeRange})`
        
                db.exec(action, (err) => {
                        if (err) {
                                bot.sendMessage(chat, `Failed to add ${stockId}.`)
                        } else {
                                bot.sendMessage(chat, `${stockId} watcher added.`)
                        }
                })
        })
}

function forget(chat, args) {
        var action = `DELETE FROM watcher WHERE chat = ${chat}`
        
        // Wildcard. Delete all
        if (args) {
                const list = `('` + args.join(`', '`) + `')`
                action = `DELETE FROM watcher WHERE stockId IN ${list} AND chat = ${chat}`
        }

        db.exec(action, (err) => {
                if (err) {
                        bot.sendMessage(chat, `Failed to delete watchers.`)
                } else {
                        bot.sendMessage(chat, `Watchers deleted.`)
                }
        })
}

function info(chat, args) {
        if (args?.length != 1) {
                bot.sendMessage(chat, 'Wrong command syntax.')
                return
        }

        bot.sendMessage(chat, `Comming soon...`)
}

function list(chat, args) {
        if (args) {
                bot.sendMessage(chat, 'Wrong command syntax.')
                return
        }

        const action = `SELECT * FROM watcher WHERE chat = ${chat}`

        db.all(action, (err, rows) => {
                var msg = `Here are all your watchers:\`\`\`\n`

                for (const { stockId, refPrice, pctLow, pctHigh } of rows) {
                        msg += ` - ${stockId}: ref=${refPrice} low=${pctLow} high=${pctHigh}\n`
                }

                bot.sendMessage(chat, msg + '\n```', {
                        parse_mode: 'MarkdownV2'
                })
        })
}

function help(chat, args) {
        if (args) {
                bot.sendMessage(chat, 'Wrong command syntax.')
                return
        }

        const separator = '\n  - '
        const fmtCmds = Object.keys(commands).join(separator)
        bot.sendMessage(chat, `Commands:${separator}${fmtCmds}`)
}

var commands = {
        watch, forget, help, list
}

// configure bot

bot.on('message', (msg) => {
        const regex = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
        const chat = msg.chat.id
        const cmdInfo = msg.text.match(regex)?.groups

        const command = commands[cmdInfo?.name]
        if (cmdInfo && command) {
                const args = cmdInfo.args?.split(' ')
                command(chat, args)
                return
        }
        
        if (cmdInfo) {
                bot.sendMessage(chat, 'what???')
                return
        }

        bot.sendMessage(chat, msg.text)
});
