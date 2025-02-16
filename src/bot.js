const { db } = require('./db')
const yf = require('yahoo-finance2').default; // https://github.com/gadicc/node-yahoo-finance2

const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api

const TELEGRAM_TK = '8075711316:AAGaVXIGrthKWKsmnbtEAa4ocdLnw-qYLRY'
const bot = new TelegramBot(TELEGRAM_TK, { polling: true });

function queryThenLog(query, chat, msg) {
    db.exec(query, (err) => {
        msg = err || msg
        console.log(msg)
        bot.sendMessage(chat, msg)
    })
}

// bot commands

function add(chat, args) {
    if (!args || args.length != 2) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    const ticker = args[0]
    const change = args[1]
    yf.quote(ticker).then((stock) => {
        const query = `INSERT OR REPLACE INTO watcher (ticker, chat, ref_price, change, ref_change)
            VALUES ('${ticker}', ${chat}, ${stock.regularMarketPrice}, ${change}, ${change})`
        const msg = `user ${chat} watching each ${100 * change}% change to
 current price (${stock.regularMarketPrice}) of ${ticker} stock`
        queryThenLog(query, chat, msg)
    })
}

function del(chat, args) {
    if (!args || args.length < 1) {
        bot.sendMessage(chat, 'Wrong command syntax.')
        return
    }

    // wildcard. delete all
    if (args.indexOf('*') >= 0) {
        const query = `DELETE FROM watcher WHERE chat == ${chat}`
        queryThenLog(query, chat, `user ${chat} not watching any stocks`)
        return
    }

    // try deleting each one of arguments
    for (const ticker of args) {
        const query = `DELETE FROM watcher WHERE ticker == '${ticker}' AND chat == ${chat}`
        queryThenLog(query, chat, `user ${chat} not watching ${ticker} anymore`)
    }
}

function unsub(chat) {
    const query = `DELETE FROM user WHERE chat == ${chat}`
    queryThenLog(query, chat, `user ${chat} unsubscribed`)
}

function help(chat) {
    const cmdsStr = Object.keys(commands).join(', ')
    bot.sendMessage(chat, `commands: ${cmdsStr}`)
}

var commands = {
    add, del, unsub, help
}

// bot """main"""

bot.on('message', (msg) => {
    const regex = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/
    const chat = msg.chat.id
    const cmdInfo = msg.text.match(regex)?.groups

    const query = `SELECT * FROM user WHERE chat == ${chat}`
    db.get(query, (err, row) => {
        if (!row) {
            const query = `INSERT INTO user (chat) VALUES (${chat})`
            queryThenLog(query, chat, `user ${chat} subscribed`)
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

// stock monitoring here

setInterval(() => {
    // for each user
    const query = `SELECT * FROM watcher`
    db.all(query, (err, rows) => {
        rows.forEach((row) => {
            const stockPromisse = yf.quote(row.ticker)
            stockPromisse.then((stock) => {
                const price = stock.regularMarketPrice
                const query = `
                    UPDATE watcher SET change = CASE
                        WHEN 1 - ${price} / ref_price > change              THEN change + ref_change
                        WHEN 1 - ${price} / ref_price < change - ref_change THEN change - ref_change
                        ELSE change
                    END
                    WHERE ticker == '${row.ticker}' AND chat == ${row.chat}`
                db.exec(query)

                const priceRel = price / row.ref_price
                if (priceRel - 1 > row.change) {
                    bot.sendMessage(row.chat, `${row.ticker} stock increased to ${price}`)
                }

                if (priceRel - 1 < row.change - row.ref_change) {
                    bot.sendMessage(row.chat, `${row.ticker} stock decreased to ${price}`)
                }
            })
        })
    })
}, 1000)