const { db, queries } = require('./db')
const bot = require('./bot')
const stocks = require('./stocks')

const listLimit = 8
const helps = {}
const cmds = {}

helps.brief = `
Commands available:
\`/help\` shows information about a command
\`/ainv\` adds or overwrites an investment
\`/cinv\` configures an investment
\`/linv\` lists up to ${listLimit} investments
\`/dinv\` deletes investments
\`/astk\` adds stocks
\`/lstk\` lists up to ${listLimit} stocks

*TIP:* Try sending \`/help {command}\` and see what happens.`

helps.ainv = `
/inv STOCK VALUE DIFF
/inv STOCK VALUE DOWN UP
\`\`\`
Simulate investment in STOCK.
VALUE must be >= 1.00.
DIFF must be > 0.00 (notification each time VALUE changes by DIFF).
STOCK must appear when you send a /stock STOCK
Reinvesting on the same stock overwrites the previous investment.
Only 2 decimals are used (e.g. 0.001 -> $0.00).
\`\`\`
Examples:
\`\`\`
/invest AMD 1 0.01
/invest AMD 1.00 1  # Overwrites previous investment
\`\`\``

helps.linv = `
/linv \\[STOCK ...]
\`\`\`
Lists your investments in specified stocks.
If no arguments are provided, lists all investments.
\`\`\`
Examples:
\`\`\`
/linv
/linv AMD TSLA NVDA
\`\`\``

helps.dinv = `
/dinv \\[STOCK ...]
\`\`\`
Deletes your investments in specified stocks.
If no arguments are provided, deletes all investments.
\`\`\`
Examples:
\`\`\`
/dinv
/dinv AMD TSLA NVDA
\`\`\``

helps.astk = `
/stk \\[STOCK ...]
\`\`\`
Lists specified stocks and their last known prices.
If no arguments are provided, lists all tracked stocks.
I just know stocks that users have invested with /invest.
\`\`\`
Examples:
\`\`\`
/stk
/stk AMD TSLA NVDA
\`\`\``

helps.lstk = `
/stk \\[STOCK ...]
\`\`\`
Lists specified stocks and their last known prices.
If no arguments are provided, lists all tracked stocks.
I just know stocks that users have invested with /invest.
\`\`\`
Examples:
\`\`\`
/stk
/stk AMD TSLA NVDA
\`\`\``

helps.help = `
/help \\[COMMAND ...]
\`\`\`
Show help for specified cmds.
Zero arguments shows all helps.
\`\`\`
Examples:
\`\`\`
/help
/help help stock
\`\`\``

cmds.ainv = (user, args) => {
    const helpy = 'Wrong command syntax. Send `/help ainv` to know more.'

    if (args.length < 3) {
        bot.sendMsg(user, helpy)
        return
    }

    const MIC = args[0]
    const value = parseFloat(args[1])
    const diffDn = parseFloat(args[2])
    const diffUp = (args.length == 3 ? diffDn : parseFloat(args[3]))
    const valuesOk = value >= 1 && diffDn >= 0.01 && diffUp >= 0.01

    if (!valuesOk) {
        bot.sendMsg(user, helpy)
        return
    }

    db.run(queries.ADD_OR_UPDATE_INVESTMENT, {
        $MIC: MIC,
        $user: user,
        $value: value.toFixed(2),
        $minValue: (value - diffDn).toFixed(2),
        $maxValue: (value + diffUp).toFixed(2)
    }, (err) => {
        // foreign key constraint violation -> no stock with that MIC
        if (err) {
            bot.sendMsg(user, `I don't know ${MIC}. Send \`/help astk\` to know more.`)
        } else {
            bot.sendMsg(user, `You invested in ${MIC}.`)
        }
    })
}

cmds.linv = (user, args) => {
    if (args.length == 0) {
        db.each(queries.GET_USER_INVESTMENTS, {
            $user: user,
            $limit: listLimit
        }, (err, row) => {
            bot.sendMsg(user, row.MIC + ' $' + row.value)
        })
    } else {
        args.length = Math.min(listLimit, args.length)

        db.each(queries.GET_SPECIFIC_USER_INVESTMENTS, {
            $MICs: JSON.stringify(args),
            $user: user,
            $limit: listLimit
        }, (err, row) => {
            bot.sendMsg(user, row.MIC + ' $' + row.value)
        })
    }
}

cmds.dinv = (user, args) => {
    if (args.length == 0) {
        db.run(queries.DEL_ALL_USER_INVESTMENTS, {
            $user: user
        }, (err) => {
            bot.sendMsg(user, 'Deleted all your investments.')
        })
    } else {
        args.length = Math.min(listLimit, args.length)

        db.each(queries.DEL_SPECIFIC_USER_INVESTMENTS, {
            $MICs: JSON.stringify(args),
            $user: user
        }, (err, row) => {
            bot.sendMsg(user, `Deleted ${row.MIC} investment`)
        })
    }
}

cmds.astk = (user, args) => {
    if (args.length == 0) {
        bot.sendMsg(user, 'Wrong command syntax. Send `/help astk` to know more.')
        return
    }

    // limit number of arguments considered and add stocks
    args.length = Math.min(listLimit, args.length)
    args.forEach((arg) => {
        stocks.addStock(arg)
    })

    bot.sendMsg(user, 'You can only invest in those stocks if `/lstk {stocks}` lists them.')
}

cmds.lstk = (user, args) => {   
    if (args.length == 0) {
        db.all(queries.GET_STOCKS, {
            $limit: listLimit
        }, (err, rows) => {
            if (rows.length == 0) {
                bot.sendMsg(user, 'There are no stock records.')
            } else {
                for (const row of rows) {
                    bot.sendMsg(user, row.MIC + ' $' + row.price.toFixed(2))
                }
            }
        })
    } else {
        args.length = Math.min(listLimit, args.length)
    
        db.all(queries.GET_SPECIFIC_STOCKS, {
            $MICs: JSON.stringify(args),
            $limit: listLimit
        }, (err, rows) => {
            if (rows.length == 0) {
                bot.sendMsg(user, 'Those stocks have no records.')
            } else {
                for (const row of rows) {
                    bot.sendMsg(user, row.MIC + ' $' + row.price.toFixed(2))
                }
            }
        })
    }
}

cmds.help = (user, args) => {
    // if no arguments then list all commands
    if (args.length === 0) {
        bot.sendMsg(user, helps.brief)
        return
    }

    const name = args[0].toLowerCase()
    bot.sendMsg(user, helps[name] || `${name} is not a valid command.`)
}

// exports

module.exports = cmds