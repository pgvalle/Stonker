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
\`/tstk\` adds stocks
\`/lstk\` lists up to ${listLimit} stocks`

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

helps.tstk = `
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
    if (args.length < 3) {
        bot.sendMsg(user, 'Give 3 or 4 arguments. See `/help ainv` to know more.')
        return
    }

    const MIC = args[0]
    const value = parseFloat(args[1])
    const diffDn = parseFloat(args[2])
    const diffUp = (args.length == 3 ? diffDn : parseFloat(args[3]))
    const valuesOk = (value >= 1 && diffDn >= 0.01 && diffUp >= 0.01)

    if (!valuesOk) {
        bot.sendMsg(user, 'Invalid values. See `/help ainv` to know more.')
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
            bot.sendMsg(user, `I don't know ${MIC}. See \`/help tstk\` to know more.`)
        } else {
            bot.sendMsg(user, `You invested in ${MIC}.`)
        }
    })
}

cmds.linv = (user, args) => {
    // limit array length to be at most listLimit
    args.length = Math.min(listLimit, args.length)

    var query = queries.GET_SPECIFIC_USER_INVESTMENTS
    const queryParams = {
        $MICs: JSON.stringify(args),
        $user: user,
        $limit: listLimit
    }

    if (args.length == 0) {
        queries.GET_USER_INVESTMENTS
    }

    db.all(query, queryParams, (err, rows) => {
        if (rows.length == 0) {
            bot.sendMsg(user, 'You have 0 investments.')
            return
        }

        if (rows.length < args.length && args.length > 0) {
            // TODO: create a better message
            bot.sendMsg(user, 'Some investments were not found, but I did what I could.')
        }

        const fmtInvestments = rows.reduce((acc, row) => {
            return acc + stocks.fmtStock(row)
        }, '')

        bot.sendMsg(user, 'Here they are:\n' + fmtInvestments)
    })
}

cmds.dinv = (user, args) => {
    // limit array length to be at most listLimit
    args.length = Math.min(listLimit, args.length)

    var query = queries.DEL_SPECIFIC_USER_INVESTMENTS
    const queryParams = {
        $MICs: JSON.stringify(args),
        $user: user
    }

    if (args.length == 0) {
        query = queries.DEL_ALL_USER_INVESTMENTS
    }

    db.all(query, queryParams, (err, rows) => {
        if (rows.length == 0) {
            bot.sendMsg(user, 'You have 0 investments.')
        } else if (rows.length == args.length && args.length > 0) {
            bot.sendMsg(user, 'Investments deleted.')
        } else if (args.length == 0) {
            bot.sendMsg(user, 'All investments deleted.')
        } else if (rows.length < args.length) {
            // TODO: create a better message
            bot.sendMsg(user, 'Some of those investments were not found, but the other ones were deleted.')
        }
    })
}

cmds.tstk = (user, args) => {
    if (args.length == 0) {
        bot.sendMsg(user, 'Give at least 1 stock to track.')
        return
    }

    // limit number of stocks to add then add
    args.length = Math.min(listLimit, args.length)
    args.forEach((arg) => {
        stocks.addStock(arg)
    })

    // TODO: create a better message
    bot.sendMsg(user, 'Wait a couple seconds and check if `/lstk` shows the stocks you added to track.')
}

cmds.lstk = (user, args) => {
    // limit array length to be at most listLimit
    args.length = Math.min(listLimit, args.length)

    var query = queries.GET_STOCKS
    const queryParams = {
        $MICs: JSON.stringify(args),
        $limit: listLimit
    }

    if (args.length == 0) {
        query = queries.GET_SPECIFIC_STOCKS
    }

    db.all(query, queryParams, (err, rows) => {
        if (rows.length == 0) {
            bot.sendMsg(user, 'There are 0 stock being tracked.')
            return
        }

        if (rows.length < args.length && args.length > 0) {
            // TODO: create a better message
            bot.sendMsg(user, 'I\'m not aware of some of those stocks, but I did what I could.')
        }

        const fmtStocks = rows.reduce((acc, row) => {
            return acc + stocks.fmtStock(row)
        }, '')

        bot.sendMsg(user, 'Here they are:\n' + fmtStocks)
    })
}

cmds.help = (user, args) => {
    // if no arguments then list all commands
    if (args.length == 0) {
        bot.sendMsg(user, helps.brief)
        return
    }

    const name = args[0].toLowerCase()
    bot.sendMsg(user, helps[name] || `${name} isn't a valid command.`)
}

// export commands

module.exports = cmds
