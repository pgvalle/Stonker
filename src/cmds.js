const { db, queries } = require('./db')
const bot = require('./bot')
const stocks = require('./stocks')

const helps = {}
const commands = {}

helps.inv = `
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

function filterFloat(value) {
    value = parseFloat(value)
    value = value.toFixed(2)
    return parseFloat(value)
}

commands.inv = async function (user, args) {
    if (args.length < 3 || args.length > 4) {
        bot.sendMsg(user, 'Wrong command syntax. Send `/help inv`.')
        return
    }

    const MIC = args[0].toUpperCase()
    const value = filterFloat(args[1])
    const diffDn = filterFloat(args[2])
    const diffUp = (args.length == 3 ? diffDn : filterFloat(args[3]))

    if (isNaN(value) || isNaN(diffDn) || isNaN(diffUp)) {
        bot.sendMsg(user, 'The values after the first argument must be numbers.')
        return
    }

    if (value < 1 || diffDn < 0.01 || diffUp < 0.01) {
        bot.sendMsg(user, 'VALUE must be >= $1\nDIFF, DOWN and UP must be > $0.00')
        return
    }

    db.run(queries.ADD_OR_UPDATE_INVESTMENT, {
        $MIC: MIC,
        $user: user,
        $value: value,
        $minValue: value - diffDn,
        $maxValue: value + diffUp
    }, (err) => {
        if (err) { // foreign key constraint violation
            bot.sendMsg(user, `I'm figuring out ${MIC}. Try again When \`/stk ${MIC}\` lists ${MIC}.`)
            stocks.addStockListener(MIC)
        } else {
            bot.sendMsg(user, `You invested in ${MIC}.`)
        }
    })
}

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

commands.linv = async function (user, args) {
    if (args.length > 8) {
        bot.sendMsg(user, `I won't list more than ${8} items at once.`)
        return
    }
    
    // uppercase all MICs
    args = args.map((MIC) => {
        return MIC.toUpperCase()
    })

    if (args.length == 0) {
        db.each(queries.GET_USER_INVESTMENTS, {
            $user: user,
            $limit: 8
        }, (err, row) => {
            bot.sendMsg(user, JSON.stringify(row))
        })

        return
    }

    db.each(queries.GET_SPECIFIED_USER_INVESTMENTS, {
        $MICs: JSON.stringify(args),
        $user: user,
        $limit: 8
    }, (err, row) => {
        bot.sendMsg(user, JSON.stringify(row))
    })
}

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

commands.dinv = async function (user, args) {
    // if (args.length == 0) {
    //     db.get(queries.DEL_USER_INVESTMENTS, {
    //         $user: user
    //     }, (err, row) => {
    //         // log
    //     })

    //     return
    // }

    // args.length = 8
    // args = args.map((MIC) => {
    //     return MIC.toUpperCase()
    // })

    // db.all(queries.GET_STOCKS, (err, rows) => {
    //     for (const row of rows) {
    //         const index = args.indexOf(row.MIC)
    //         if (index >= 0) {
    //             bot.sendMsg(user, JSON.stringify(row))
    //             args.splice(index, 1)
    //         }
    //     }

    //     args = args.join(', ')
    //     bot.sendMsg(user, args + ' are not listed.')
    // })

    // // delete specified investments
    // if (args.length > 0) {
    //     const investments = `('` + args.join(`', '`).toUpperCase() + `')`
    //     query = `
    //         DELETE FROM investment WHERE stockMIC IN ${investments}
    //             AND user = ${user} RETURNING rowid`
    //     reply = 'Now those investments are gone.'
    // }

    // core.dbExecOrError('all', query, async (investments) => {
    //     if (investments.length == 0 && args.length == 0) {
    //         await bot.sendMsg(user, 'You have no investments to delete.')
    //     } else if (investments.length == 0 && args.length > 0) {
    //         await bot.sendMsg(user, 'You do not have those investments.')
    //     } else { // investments.length == args.length -> deleted all investments specified
    //         await bot.sendMsg(user, reply)
    //     }
    // })
}

helps.stk = `
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

commands.stk = function (user, args) {
    if (args.length > 8) {
        bot.sendMsg(user, `I won't list more than ${8} items at once.`)
        return
    }

    args = args.map((arg) => {
        arg = arg.toUpperCase()
        stocks.addStockListener(arg)
        return arg
    })
    
    if (args.length == 0) {
        db.all(queries.GET_STOCKS, {
            $limit: 8
        }, (err, rows) => {
            if (rows.length == 0) {
                bot.sendMsg(user, 'There are no stock records.')
            } else {
                for (const row of rows) {
                    bot.sendMsg(user, row.MIC + ' $' + row.price.toFixed(2))
                }
            }
        })

        return
    }
    
    db.all(queries.GET_SPECIFIED_STOCKS, {
        $MICs: JSON.stringify(args),
        $limit: 8
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

helps.help = + `
/help \\[COMMAND ...]
\`\`\`
Show help for specified commands.
Zero arguments shows all helps.
\`\`\`
Examples:
\`\`\`
/help
/help help stock
\`\`\``

commands.help = async function (user, args) {
    // if no arguments then list all commands
    if (args.length == 0) {
        args = Object.keys(commands)
    }

    for (const arg of args) {
        const help = helps[arg.toLowerCase()]
        if (help) {
            await bot.sendMsg(user, help)
        }
    }
}

// exports

module.exports = commands