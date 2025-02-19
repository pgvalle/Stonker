// const YahooFinance = require('yahoo-finance2').default; // https://github.com/gadicc/node-yahoo-finance2
// YahooFinance.suppressNotices(['yahooSurvey'])
import 'node-telegram-bot-api' // https://github.com/yagop/node-telegram-bot-api

const TELEGRAM_BOT_TK = '8075711316:AAGaVXIGrthKWKsmnbtEAa4ocdLnw-qYLRY'
const bot = new TelegramBot(TELEGRAM_BOT_TK, { polling: true })

function notifyUsers(watchers, newStockPrice) {
    for (const { stockId, chat, change } of watchers) {
        const msg = `${stockId}` // TODO: set message
        bot.sendMessage(chat, msg)
    }
}

const { db } = require('./db')

function dbExecThenLog(query, chat, msg) {
    db.exec(query, (err) => {
        msg = err || msg
        console.log(msg)
        bot.sendMessage(chat, msg)
    })
}


// bot commands

function add(chat, args) {
    if (!args || args.length % 2 == 1) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    async function innerAdd(ticker, change) {
        const quote = await YahooFinance.quote(ticker)
        if (!quote) {
            bot.sendMessage(chat, `I do not know a company with the ticker ${ticker}`)
            return
        }

        const query1 = `SELECT * FROM watcher WHERE ticker == '${ticker}'`
        db.all(query1, (err, rows) => {
            if (rows.indexOf(ticker) < 0) {
                StockSocket.addTicker(ticker, (stockData) => {
                    
                })
            }
        })
        

        const price = quote.regularMarketPrice
        const query = `
            INSERT OR REPLACE INTO watcher (ticker, chat, ref_price, change, ref_change)
            VALUES ('${ticker}', ${chat}, ${price}, ${change}, ${change})`
        var msg = `user ${chat} watching changes of ${100 * change}% `
        msg    += `to ${quote.shortName} stocks. The Rerefence price is ${price}`

        dbExecThenLog(query, chat, msg)
    }

    for (var i = 0; i < args.length; i += 2) {
        const numArg = Number(args[i + 1])
        if (isNaN(numArg) || numArg <= 0) {
            bot.sendMessage(chat, `${args[1]} is not a number greater than 0`)
            return
        }

        innerAdd(args[i].toUpperCase(), numArg)
    }
}

function del(chat, args) {
    if (!args || args.length < 1) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    // wildcard. delete all
    if (args.indexOf('*') >= 0) {
        const query = `DELETE FROM watcher WHERE chat == ${chat}`
        dbExecThenLog(query, chat, `user ${chat} not watching stocks anymore`)
        return
    }

    // try deleting each one of arguments
    for (const ticker of args) {
        const query = `DELETE FROM watcher WHERE ticker == '${ticker}' AND chat == ${chat}`
        dbExecThenLog(query, chat, `user ${chat} not watching ${ticker} anymore`)
    }
}

function info(chat, args) {
    if (!args || args.length != 1) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    async function innerInfo(ticker) {
        const quote = await YahooFinance.quote(ticker)
        if (!quote) {
            bot.sendMessage(chat, `I do not know a company with the ticker ${ticker}`)
            return
        }

        console.log(quote)
        var msg = `company name: ${quote.shortName}\n`
        msg    += `asset price: ${quote.regularMarketPrice}\n`
        msg    += `currency: ${quote.currency}\n`
        msg    += `exgchange: ${quote.exchange}\n`
        msg    += `market: ${quote.market}\n`
        msg    += `market state: ${quote.marketState}\n`

        bot.sendMessage(chat, msg)
    }

    innerInfo(args[0])
}

function unsub(chat, args) {
    if (args) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    const query = `DELETE FROM user WHERE chat == ${chat}`
    dbExecThenLog(query, chat, `user ${chat} unsubscribed`)
}

function help(chat, args) {
    if (args) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    const fmtCmds = Object.keys(commands).join(', ')
    bot.sendMessage(chat, `commands: ${fmtCmds}`)
}

var commands = {
    add, del, unsub, help, info
}

// configure bot

bot.on('message', (msg) => {
    const regex = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    const chat = msg.chat.id
    const cmdInfo = msg.text.match(regex)?.groups

    const query = `SELECT * FROM user WHERE chat == ${chat}`
    db.get(query, (err, row) => {
        if (!row) {
            const query = `INSERT INTO user (chat) VALUES (${chat})`
            dbExecThenLog(query, chat, `user ${chat} subscribed`)
            return
        }

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
    })
});

// stock monitoring

setInterval(() => {
    // for each user
    const query = `SELECT * FROM watcher`
    db.all(query, async (err, rows) => {
        for (row of rows) {
            const quote = await YahooFinance.quote(row.ticker)
            const price = quote.regularMarketPrice
            const priceRel = price / row.ref_price - 1
            const query = `
                UPDATE watcher SET change = CASE
                    WHEN ${priceRel} > change              THEN change + ref_change
                    WHEN ${priceRel} < change - ref_change THEN change - ref_change
                    ELSE change
                END
                WHERE ticker == '${row.ticker}' AND chat == ${row.chat}`

            db.exec(query, (err) => {
                if (err) {
                    console.log(err)
                    return
                }

                if (priceRel > row.change || priceRel < row.change - row.ref_change) {
                    const percent = 100 * priceRel
                    var msg = `Change of ${percent}% in ${quote.shortName} stocks!\n`
                    msg    += `They went from ${row.ref_price} to ${price}.`

                    bot.sendMessage(row.chat, msg)
                }
            })

            
        }
    })
}, 5000)
